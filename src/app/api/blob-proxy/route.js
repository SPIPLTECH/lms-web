import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { get } from "@vercel/blob";

import {
  CONTENT_ACTIVE_ON_ANOTHER_DEVICE,
  contentAccessFor,
  isAllowedBlobUrl,
  resolveCaller,
} from "@/lib/server/sessionCaller";

/**
 * Serves private Vercel Blob files to signed-in users.
 *
 * Authorization: the caller must hold a valid LMS session. The browser sends
 * this route its `accessToken` and `deviceKey` cookies (same origin), and the
 * route asks the API to validate them (GET /auth/profile runs the full session
 * gate: ACTIVE, unexpired, bound device, active account).
 *
 * Video and audio are not served to students here: a student's player gets
 * media only through a playback lease (POST /playback/start on the API, which
 * issues a short-lived, lease-bound URL). Instructors and admins may preview
 * any file. Responses are `private, no-store` — never cached by a CDN or
 * shared cache — and streamed rather than buffered.
 *
 * Students also get nothing here while another device of their account holds
 * the playback lease (409 CONTENT_ACTIVE_ON_ANOTHER_DEVICE; checked with the
 * API on every request, so a saved proxy URL or a PDF viewer's later range
 * request is refused too). If that check gets no answer, the file is refused.
 *
 * Limitation: non-media private files (PDFs, images) are checked for a valid
 * session, not for enrollment in the course that uses them.
 */

const PRIVATE_NO_STORE = "private, no-store";

const jsonError = (status, error, code) =>
  NextResponse.json({ success: false, error, code }, { status, headers: { "Cache-Control": PRIVATE_NO_STORE } });

async function callerFromCookies() {
  const store = await cookies();
  const credentials = {
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
    accessToken: store.get("accessToken")?.value,
    deviceKey: store.get("deviceKey")?.value,
  };
  const caller = await resolveCaller(credentials);
  // STUDENT only: no course file bytes while another device of the account
  // is playing (the API's content endpoints apply the same rule).
  return caller && { ...caller, access: await contentAccessFor({ ...credentials, role: caller.role }) };
}

const isMediaType = (contentType) => /^(video|audio)\//i.test(contentType || "");

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    let targetUrl = searchParams.get("url");

    if (!targetUrl) {
      return jsonError(400, "Missing url parameter");
    }

    // Un-nest double-encoded proxy URLs if present
    while (targetUrl && (targetUrl.includes("/api/blob-proxy") || targetUrl.includes("url="))) {
      try {
        const decoded = decodeURIComponent(targetUrl);
        const match = decoded.match(/url=([^&]+)/);
        if (match && match[1]) {
          targetUrl = match[1];
        } else {
          break;
        }
      } catch {
        break;
      }
    }

    // SSRF & Domain Validation: Target must be a Vercel Blob store URL. This
    // route sends the Blob token to the target, so the host check is strict
    // (see lib/server/sessionCaller.js).
    if (!isAllowedBlobUrl(targetUrl)) {
      return jsonError(400, "Forbidden: Target URL does not belong to Vercel Blob storage.");
    }

    const caller = await callerFromCookies();
    if (!caller) {
      return jsonError(401, "Sign in to view this file.", "AUTH_REQUIRED");
    }
    if (caller.access === "blocked") {
      return jsonError(
        409,
        "This account is currently active on another device. Stop playback on that device to access course content here.",
        CONTENT_ACTIVE_ON_ANOTHER_DEVICE
      );
    }
    if (caller.access === "unknown") {
      return jsonError(503, "Could not confirm access to this file. Please try again.");
    }

    // Server-side secret token ONLY (Never use or expose NEXT_PUBLIC_* tokens)
    const blobToken = process.env.VERCEL_BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) {
      console.error("[BLOB PROXY ERROR] Neither VERCEL_BLOB_READ_WRITE_TOKEN nor BLOB_READ_WRITE_TOKEN is configured in server environment.");
      return jsonError(500, "Server error: Vercel Blob token is missing in server environment variables.");
    }

    const mayStreamMedia = caller.role === "INSTRUCTOR" || caller.role === "ADMIN";
    const mediaRefused = () =>
      jsonError(403, "Videos play through the lesson player.", "CONTENT_ACCESS_DENIED");

    // Optional Range header for react-pdf / PDF.js and media seeking
    const rangeHeader = request.headers.get("range");

    // 1. No range requested: the SDK's private read, streamed through.
    if (!rangeHeader) {
      try {
        const blobResult = await get(targetUrl, { access: "private", token: blobToken });
        if (blobResult && blobResult.stream) {
          const contentType = blobResult.blob?.contentType || "application/octet-stream";
          if (isMediaType(contentType) && !mayStreamMedia) {
            blobResult.stream.cancel?.().catch?.(() => {});
            return mediaRefused();
          }
          const headers = {
            "Content-Type": contentType,
            "Cache-Control": PRIVATE_NO_STORE,
            "Accept-Ranges": "bytes",
          };
          if (blobResult.blob?.size) headers["Content-Length"] = String(blobResult.blob.size);
          return new NextResponse(blobResult.stream, { status: 200, headers });
        }
      } catch (sdkErr) {
        console.warn("[BLOB PROXY] @vercel/blob SDK get() note:", sdkErr?.message || sdkErr);
      }
    }

    // 2. Authenticated fetch, forwarding Range.
    const upstream = await fetch(targetUrl, {
      headers: {
        Authorization: `Bearer ${blobToken}`,
        ...(rangeHeader ? { Range: rangeHeader } : {}),
      },
      cache: "no-store",
    });

    if (!upstream.ok) {
      return new NextResponse(`Storage provider returned HTTP ${upstream.status}: ${upstream.statusText}`, {
        status: upstream.status,
        headers: { "Cache-Control": PRIVATE_NO_STORE },
      });
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    if (isMediaType(contentType) && !mayStreamMedia) {
      upstream.body?.cancel?.().catch?.(() => {});
      return mediaRefused();
    }

    const headers = {
      "Content-Type": contentType,
      "Cache-Control": PRIVATE_NO_STORE,
      "Accept-Ranges": "bytes",
    };
    const contentLength = upstream.headers.get("content-length");
    const contentRange = upstream.headers.get("content-range");
    if (contentLength) headers["Content-Length"] = contentLength;
    if (contentRange) headers["Content-Range"] = contentRange;

    return new NextResponse(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    console.error("[BLOB PROXY UNHANDLED ERROR]", error);
    return jsonError(500, error instanceof Error ? error.message : "Proxy error");
  }
}

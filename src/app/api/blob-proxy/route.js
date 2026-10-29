import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { get } from "@vercel/blob";

import {
  CONTENT_ACTIVE_ON_ANOTHER_DEVICE,
  createCallerCache,
  isAllowedBlobUrl,
  resolveCallerWithAccess,
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
// An image may stay in this viewer's own browser for an hour: a Blob URL is
// unique per upload, so a kept copy is never stale, and `private` keeps it
// out of every shared cache. PDFs, video and audio stay no-store.
const PRIVATE_IMAGE_CACHE = "private, max-age=3600";

const jsonError = (status, error, code) =>
  NextResponse.json({ success: false, error, code }, { status, headers: { "Cache-Control": PRIVATE_NO_STORE } });

// Successful session/lease checks, remembered for 60 s per session and
// device so a page's many file requests don't each wait on two API calls.
const callerCache = createCallerCache({ ttlMs: 60_000 });

async function callerFromCookies() {
  const store = await cookies();
  const credentials = {
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
    accessToken: store.get("accessToken")?.value,
    deviceKey: store.get("deviceKey")?.value,
  };
  // STUDENT only: no course file bytes while another device of the account
  // is playing (the API's content endpoints apply the same rule).
  return resolveCallerWithAccess(credentials, callerCache);
}

const isMediaType = (contentType) => /^(video|audio)\//i.test(contentType || "");
const isImageType = (contentType) => /^image\//i.test(contentType || "");

// ?w= asks for an image scaled down to that width — a course card shows a
// 1672 px, 1.7 MB cover at ~320 px. Only these widths, so the resize cache
// below stays small and the route can't be used to burn CPU.
const RESIZE_WIDTHS = [320, 480, 640, 960, 1280, 1920];
const RESIZABLE = /^image\/(jpeg|jpg|png|webp|avif)$/i;
const requestedWidth = (searchParams) => {
  const w = Number(searchParams.get("w"));
  return RESIZE_WIDTHS.includes(w) ? w : null;
};

// Resized images, kept in memory so the same cover isn't fetched from Blob
// and re-encoded for every viewer. Served only after the caller's own check
// above, like any other file. Bounded by total bytes; oldest out first.
const RESIZED_BUDGET_BYTES = 40 * 1024 * 1024;
const resizedImages = new Map();
let resizedBytes = 0;
const rememberResized = (key, entry) => {
  if (entry.body.length > RESIZED_BUDGET_BYTES / 4) return;
  resizedImages.set(key, entry);
  resizedBytes += entry.body.length;
  while (resizedBytes > RESIZED_BUDGET_BYTES) {
    const [oldestKey, oldest] = resizedImages.entries().next().value;
    resizedImages.delete(oldestKey);
    resizedBytes -= oldest.body.length;
  }
};

/** The image scaled to `width` as WebP, or null when it can't be (no sharp, bad image). */
async function resizeImage(stream, width) {
  try {
    const { default: sharp } = await import("sharp");
    const input = Buffer.from(await new Response(stream).arrayBuffer());
    const body = await sharp(input).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
    return { body, contentType: "image/webp" };
  } catch (error) {
    console.warn("[BLOB PROXY] image resize skipped:", error?.message || error);
    return null;
  }
}

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

    // Normalize legacy R2 bucket URLs to active Vercel Blob storage
    if (targetUrl && targetUrl.includes("r2.cloudflarestorage.com/orangetreeprivate/")) {
      targetUrl = targetUrl.replace(
        /https:\/\/[^/]+\.r2\.cloudflarestorage\.com\/orangetreeprivate\//,
        "https://qcgudnz7gjfguvas.private.blob.vercel-storage.com/"
      );
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
    const width = rangeHeader ? null : requestedWidth(searchParams);

    // A resized copy already made for another viewer.
    const resizedKey = width ? `${targetUrl}\u0000${width}` : null;
    const cachedResized = resizedKey && resizedImages.get(resizedKey);
    if (cachedResized) {
      return new NextResponse(cachedResized.body, {
        status: 200,
        headers: {
          "Content-Type": cachedResized.contentType,
          "Content-Length": String(cachedResized.body.length),
          "Cache-Control": PRIVATE_IMAGE_CACHE,
        },
      });
    }

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
          if (width && RESIZABLE.test(contentType)) {
            const resized = await resizeImage(blobResult.stream, width);
            if (resized) {
              rememberResized(resizedKey, resized);
              return new NextResponse(resized.body, {
                status: 200,
                headers: {
                  "Content-Type": resized.contentType,
                  "Content-Length": String(resized.body.length),
                  "Cache-Control": PRIVATE_IMAGE_CACHE,
                },
              });
            }
            // Couldn't resize: the stream is spent, so read the original
            // again below rather than send nothing.
          } else {
            const headers = {
              "Content-Type": contentType,
              "Cache-Control": isImageType(contentType) ? PRIVATE_IMAGE_CACHE : PRIVATE_NO_STORE,
              "Accept-Ranges": "bytes",
            };
            if (blobResult.blob?.size) headers["Content-Length"] = String(blobResult.blob.size);
            return new NextResponse(blobResult.stream, { status: 200, headers });
          }
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
      "Cache-Control": isImageType(contentType) && !rangeHeader ? PRIVATE_IMAGE_CACHE : PRIVATE_NO_STORE,
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

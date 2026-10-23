import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { normalizeUploadsPath } from "@/lib/server/sessionCaller";

/**
 * Serves course files kept on the API's disk (/uploads/contents, attachments,
 * course-imports, …) to the browser, same origin.
 *
 * The API serves those files only to a request carrying the session as
 * headers (Authorization: Bearer + X-Device-Key) — never as a URL query,
 * which would leak through logs, history and Referer. An <img>, <iframe> or
 * download link cannot send headers, so it points here instead
 * (lib/blob.js getDisplayUrl): this route reads the browser's session
 * cookies, forwards them to the API as those headers, and streams the answer
 * back. The API decides: a valid session, the evaluator period, and — for a
 * student — that no other device of the account holds the playback lease
 * (409 CONTENT_ACTIVE_ON_ANOTHER_DEVICE). Its refusals are passed through as
 * they are; nothing here falls back to another way of loading the file.
 *
 * Public images (avatars, thumbnails) do not come through here.
 */

const PRIVATE_NO_STORE = "private, no-store";

const jsonError = (status, error, code) =>
  NextResponse.json({ success: false, error, message: error, code }, { status, headers: { "Cache-Control": PRIVATE_NO_STORE } });

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const filePath = normalizeUploadsPath(searchParams.get("path"));
  if (!filePath) return jsonError(400, "Invalid file path.");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return jsonError(500, "The API address is not configured.");

  const store = await cookies();
  const accessToken = store.get("accessToken")?.value;
  const deviceKey = store.get("deviceKey")?.value;
  if (!accessToken) return jsonError(401, "Sign in to view this file.", "AUTH_REQUIRED");

  const range = request.headers.get("range");
  let upstream;
  try {
    upstream = await fetch(`${apiUrl.replace(/\/+$/, "")}${filePath}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(deviceKey ? { "X-Device-Key": deviceKey } : {}),
        ...(range ? { Range: range } : {}),
      },
      cache: "no-store",
      redirect: "error",
    });
  } catch {
    return jsonError(503, "Could not reach the file service. Please try again.");
  }

  const headers = { "Cache-Control": PRIVATE_NO_STORE };
  for (const name of ["content-type", "content-length", "content-range", "accept-ranges"]) {
    const value = upstream.headers.get(name);
    if (value) headers[name] = value;
  }
  // Success or refusal alike: the API's status and body, unchanged.
  return new NextResponse(upstream.body, { status: upstream.status, headers });
}

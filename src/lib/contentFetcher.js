import axios from "axios";
import api from "@/lib/axios";
import { getApiOrigin } from "@/lib/apiOrigin";
import { isContentBlockedError } from "@/lib/sessionErrors";

/**
 * Fetches a course file's bytes for a viewer (PDF, Word, PowerPoint, image)
 * that renders from memory rather than handing the browser a URL.
 *
 * Credentials go ONLY to our own protected routes:
 *  - the frontend's same-origin proxies (/api/blob-proxy, /api/uploads-proxy,
 *    /api/external-file/*), which read this browser's session cookies;
 *  - the API origin (/uploads/...), through the shared `api` client, which
 *    adds the Bearer token and device key.
 * Anything else (a public link) is fetched without credentials — a token is
 * never sent to a third-party host.
 *
 * A refusal under the student content-access rule (409
 * CONTENT_ACTIVE_ON_ANOTHER_DEVICE) is announced with "lms:content-blocked",
 * so the page's access guard blocks at once. Any failure throws: callers must
 * not fall back to loading the same file some other way.
 */

const SAME_ORIGIN_PROTECTED = ["/api/blob-proxy", "/api/uploads-proxy", "/api/external-file/"];

const isApiUrl = (url) => {
  const apiOrigin = getApiOrigin();
  return (
    url.startsWith("/uploads/") ||
    url.startsWith("/playback/") ||
    Boolean(apiOrigin && (url.startsWith(`${apiOrigin}/uploads/`) || url.startsWith(`${apiOrigin}/playback/`)))
  );
};

/** Whether this URL is one of our own protected file routes. */
export function isProtectedContentUrl(url) {
  if (!url || typeof url !== "string") return false;
  return SAME_ORIGIN_PROTECTED.some((prefix) => url.startsWith(prefix)) || isApiUrl(url);
}

/** The student content-access refusal (by code — not any 409). */
export function isDeviceConflictError(err) {
  return isContentBlockedError(err);
}

function notifyContentBlocked(err) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("lms:content-blocked", { detail: { error: err } }));
  }
}

export async function fetchContentData(url, { responseType = "blob", signal } = {}) {
  if (!url) throw new Error("No URL provided");

  try {
    if (isApiUrl(url)) {
      const res = await api.get(url, { responseType, signal });
      return res.data;
    }
    if (SAME_ORIGIN_PROTECTED.some((prefix) => url.startsWith(prefix))) {
      // Same origin: the browser sends the session cookies the proxy checks.
      const res = await axios.get(url, { responseType, signal, withCredentials: true });
      return res.data;
    }
    const res = await axios.get(url, { responseType, signal });
    return res.data;
  } catch (err) {
    if (isDeviceConflictError(await withJsonBody(err, responseType))) notifyContentBlocked(err);
    throw err;
  }
}

/**
 * With responseType blob/arraybuffer, an error body (the JSON carrying the
 * refusal's `code`) arrives as bytes; parse it so the code can be read.
 */
async function withJsonBody(err, responseType) {
  const data = err?.response?.data;
  if (!data || responseType === "json" || typeof data === "string" || data?.code) return err;
  try {
    const text = typeof Blob !== "undefined" && data instanceof Blob
      ? await data.text()
      : new TextDecoder().decode(data);
    err.response.data = JSON.parse(text);
  } catch {
    // not JSON: leave it
  }
  return err;
}

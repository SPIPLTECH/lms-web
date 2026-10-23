import { getApiOrigin } from "@/lib/apiOrigin";

/**
 * Resolves media URLs for browser display.
 * - If the URL points to a private Vercel Blob store (.private.blob.vercel-storage.com),
 *   it routes through the secure server proxy (/api/blob-proxy) using server credentials,
 *   allowing standard HTML elements (<img>, <video>, <iframe>) to render private files securely.
 * - If the URL is root-relative (e.g. "/uploads/thumbnails/x.png", returned by legacy/imported
 *   courses that were saved to the API's local disk instead of Blob storage), it is prefixed
 *   with the API origin. Otherwise a relative path resolves against the frontend's own origin
 *   (e.g. the Vercel deployment) and 404s, since that file only exists on the API server.
 */
export function getDisplayUrl(url) {
  if (!url || typeof url !== "string") return "";

  // Convert Google Drive view/share links to direct image CDN links
  const driveFileMatch = url.match(/drive\.google\.com\/file\/d\/([^\/\?#]+)/);
  if (driveFileMatch && driveFileMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveFileMatch[1]}`;
  }

  const driveIdMatch = url.match(/drive\.google\.com\/open\?id=([^&]+)/);
  if (driveIdMatch && driveIdMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveIdMatch[1]}`;
  }

  if (url.includes("/api/blob-proxy")) {
    return url;
  }
  if (
    url.includes(".private.blob.vercel-storage.com") ||
    url.includes("vercel.com/api/blob") ||
    url.includes("pathname=")
  ) {
    return `/api/blob-proxy?url=${encodeURIComponent(url)}`;
  }
  // Resolved per call, not once at module load: getApiOrigin() needs the host
  // this browser is on to serve /uploads over the LAN. See lib/apiOrigin.js.
  const apiOrigin = getApiOrigin();

  // Course files on the API's disk need the session (sent as headers, which
  // an <img>/<iframe>/link cannot add): they load through the same-origin
  // proxy, which forwards it. Public images (avatars, thumbnails) do not.
  const uploadsPath = apiUploadsPath(url, apiOrigin);
  if (uploadsPath && !isPublicUploadsPath(uploadsPath)) {
    return `/api/uploads-proxy?path=${encodeURIComponent(uploadsPath)}`;
  }

  if (url.startsWith("/") && apiOrigin) {
    return `${apiOrigin}${url}`;
  }
  return url;
}

const PUBLIC_UPLOAD_DIRS = ["avatars", "thumbnails"];

const isPublicUploadsPath = (uploadsPath) => PUBLIC_UPLOAD_DIRS.includes(uploadsPath.split("/")[2]);

/**
 * "/uploads/..." when `url` names a file on the API's own disk — written
 * root-relative, or absolute on the API's origin (this browser's, or the
 * configured one the API stamps into upload URLs). Null otherwise.
 */
function apiUploadsPath(url, apiOrigin) {
  if (url.startsWith("/uploads/")) return url.split(/[?#]/)[0];
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!parsed.pathname.startsWith("/uploads/")) return null;
  const apiOrigins = [apiOrigin, process.env.NEXT_PUBLIC_API_URL]
    .filter(Boolean)
    .map((origin) => {
      try {
        return new URL(origin).origin;
      } catch {
        return null;
      }
    });
  return apiOrigins.includes(parsed.origin) ? parsed.pathname : null;
}

const PRIVATE_BLOB_ATTR_RE = /(src|href)(\s*=\s*)(["'])(https:\/\/[^"']*\.private\.blob\.vercel-storage\.com[^"']*)\3/gi;

/**
 * Imported lesson HTML (Content.htmlContent) can carry raw <img>/<a> tags
 * that point straight at a private Vercel Blob URL — the markdown/HTML
 * importer never rewrote them, so the browser requests them directly and
 * gets a 403 instead of going through getDisplayUrl()'s /api/blob-proxy.
 * Rewrites just those attribute values in place; everything else in the
 * markup is left untouched.
 */
export function rewritePrivateBlobUrlsInHtml(html) {
  if (!html || typeof html !== "string") return html;
  return html.replace(
    PRIVATE_BLOB_ATTR_RE,
    (_match, attr, eq, quote, url) => `${attr}${eq}${quote}${getDisplayUrl(url)}${quote}`
  );
}

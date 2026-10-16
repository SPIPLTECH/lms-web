import { getYouTubeVideoId, isYouTubeUrl } from "@/lib/youtube";
import { getDisplayUrl } from "@/lib/blob";

const VIMEO_ID_PATTERN = /vimeo\.com\/(?:video\/)?(\d+)/;

/**
 * Privacy-enhanced host. It serves the same player and the same IFrame API as
 * www.youtube.com, but does not set tracking cookies until playback starts.
 */
export const YOUTUBE_EMBED_HOST = "https://www.youtube-nocookie.com";

/**
 * The player parameters every YouTube surface in the app shares.
 *   rel=0         — end-of-video suggestions stay on the same channel.
 *   playsinline=1 — iOS keeps playback inside the frame instead of taking
 *                   over the screen.
 *   enablejsapi=1 — lets our own code drive the player (seek, progress).
 *
 * Deliberately NOT here: any parameter claimed to strip YouTube's title,
 * share or "Watch on YouTube" chrome. None exists. That chrome is drawn by
 * YouTube inside a cross-origin iframe and is required by its Terms of
 * Service — see VideoSurface for the full note.
 */
export function getYouTubeEmbedParams(videoId, { start = 0 } = {}) {
  return {
    start: start || 0,
    rel: 0,
    playsinline: 1,
    enablejsapi: 1,
    // controls=0 because the application draws its own control bar below the
    // frame and drives playback through the IFrame Player API. This is the
    // officially supported parameter for it — the alternative, covering
    // YouTube's controls with our own, is forbidden by its embedded player
    // requirements and would swallow clicks the player needs.
    controls: 0,
    ...(typeof window !== "undefined" ? { origin: window.location.origin } : {}),
  };
}

/**
 * The embed URL form of the same player. VideoSurface drives YouTube through
 * the IFrame API rather than a bare <iframe src>, so this is what callers who
 * only want a URL get — built from getYouTubeEmbedParams() above so the two
 * cannot drift into configuring the same player differently.
 */
function buildYouTubeEmbedUrl(videoId) {
  const params = new URLSearchParams(
    Object.entries(getYouTubeEmbedParams(videoId)).map(([key, value]) => [key, String(value)])
  );
  return `${YOUTUBE_EMBED_HOST}/embed/${videoId}?${params.toString()}`;
}

/**
 * The single place the app decides how a stored video renders. Takes either a
 * Content row or a bare URL and returns one of:
 *
 *   { kind: "youtube", videoId, embedUrl, url }
 *   { kind: "vimeo",   embedUrl, url }
 *   { kind: "file",    src, url }   — our own uploaded/hosted media
 *   { kind: "invalid", url }        — a YouTube link with no video in it
 *   { kind: "none" }
 *
 * "file" is the only kind that can be played by a fully application-controlled
 * player; the other two are third-party iframes whose in-frame UI we do not
 * own. Content stores its source on `videoUrl`, with `fileUrl`/`externalUrl`
 * as the fallbacks older imported rows used.
 */
export function resolveVideoSource(input) {
  const url =
    typeof input === "string"
      ? input
      : input?.videoUrl || input?.fileUrl || input?.externalUrl || "";

  if (!url) return { kind: "none", url: "" };

  const videoId = getYouTubeVideoId(url);
  if (videoId) {
    return { kind: "youtube", videoId, embedUrl: buildYouTubeEmbedUrl(videoId), url };
  }

  // A YouTube link we could not read an 11-character video id out of: a
  // playlist, a channel, or a mistyped id. It is not our own media, so letting
  // it fall through to "file" below would point a <video> element at a YouTube
  // HTML page — a guaranteed decode failure, reported to the instructor as an
  // unsupported video format rather than as the bad link it actually is.
  if (isYouTubeUrl(url)) return { kind: "invalid", url };

  const vimeo = url.match(VIMEO_ID_PATTERN);
  if (vimeo) {
    return { kind: "vimeo", embedUrl: `https://player.vimeo.com/video/${vimeo[1]}`, url };
  }

  // Everything else is our own media: a Vercel Blob upload, a file served from
  // the API's /uploads, or a plain direct link. getDisplayUrl routes private
  // Blob URLs through /api/blob-proxy and resolves root-relative paths against
  // the API origin, so the element it lands in can just use it.
  return { kind: "file", src: getDisplayUrl(url), url };
}

/** True when the source can drive an application-controlled player. */
export function isAppControllable(source) {
  return source?.kind === "file";
}

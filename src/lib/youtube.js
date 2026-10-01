// Matches youtube.com/watch?v=, youtu.be/, youtube.com/embed/, youtube.com/shorts/,
// youtube.com/live/ and youtube.com/v/ — on youtube-nocookie.com too.
const YOUTUBE_ID_PATTERN =
  /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

const YOUTUBE_HOST_PATTERN =
  /^(?:https?:)?(?:\/\/)?(?:[a-z0-9-]+\.)*(?:youtube(?:-nocookie)?\.com|youtu\.be)(?:[/?#:]|$)/i;

export function getYouTubeVideoId(url) {
  if (!url) return null;
  const match = url.match(YOUTUBE_ID_PATTERN);
  return match ? match[1] : null;
}

export function isYouTubeUrl(url) {
  return Boolean(getYouTubeVideoId(url));
}

/**
 * True for any link to YouTube, including one no video id can be read from
 * (a channel page, a truncated link). The lesson player uses it to show
 * "unable to load this video" for such a link instead of treating it as a
 * video file.
 */
export function isYouTubeHostUrl(url) {
  return typeof url === "string" && YOUTUBE_HOST_PATTERN.test(url.trim());
}

export function getYouTubeEmbedUrl(url) {
  const videoId = getYouTubeVideoId(url);
  if (!videoId) return null;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const originParam = origin ? `?enablejsapi=1&origin=${encodeURIComponent(origin)}` : "";
  return `https://www.youtube.com/embed/${videoId}${originParam}`;
}

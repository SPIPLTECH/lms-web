// The one place the app reads a YouTube link. Everything that renders a video
// goes through resolveVideoSource() in videoSource.js, which is the only
// caller of getYouTubeVideoId() — there is deliberately no second parser and
// no second embed-URL builder anywhere in the codebase.

// Matches youtube.com/watch?v=, youtu.be/, youtube.com/embed/,
// youtube.com/shorts/ and youtube.com/v/, with any trailing query string
// (?si=…, &t=…) left alone.
//
// youtube-nocookie.com is accepted on the same footing because it is the host
// this app embeds on: a URL copied back out of one of our own players has to
// resolve to the video it plays.
//
// The trailing lookahead matters: a video id is exactly 11 characters, so
// without it a mistyped link like youtu.be/wRejGDZKJiMEXTRA would match its
// first 11 characters and silently embed a different, real video instead of
// being reported as unreadable.
const YOUTUBE_ID_PATTERN =
  /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?![a-zA-Z0-9_-])/;

// A YouTube-owned host, with or without a scheme or a subdomain (www, m,
// music). Anchoring on "//" , "." or the start of the string keeps
// lookalikes such as notyoutube.com from matching.
const YOUTUBE_HOST_PATTERN =
  /(?:^|\/\/|\.)(?:youtube(?:-nocookie)?\.com|youtu\.be)(?:[/?#]|$)/i;

/** The 11-character video id in a YouTube URL, or null if there isn't one. */
export function getYouTubeVideoId(url) {
  if (!url) return null;
  const match = url.match(YOUTUBE_ID_PATTERN);
  return match ? match[1] : null;
}

/**
 * True for any link on a YouTube host — including the ones no video id can be
 * read out of, such as a playlist, a channel or a mistyped watch URL. That is
 * the point: it lets the resolver tell "a YouTube link we can't play" apart
 * from "someone else's direct media file", which otherwise both look like an
 * unrecognised URL.
 */
export function isYouTubeUrl(url) {
  return Boolean(url) && YOUTUBE_HOST_PATTERN.test(url);
}

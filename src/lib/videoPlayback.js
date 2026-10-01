// Pure helpers for the lesson video player (OrangeVideoPlayer). No DOM and no
// player instance in here, so they can be unit-tested with plain node — see
// src/lib/__tests__/videoPlayback.test.js.

/** "1:05" or "1:02:05". Anything that is not a real, positive time reads as 0:00. */
export function formatVideoTime(seconds) {
  const total = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = String(total % 60).padStart(2, "0");
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${secs}` : `${minutes}:${secs}`;
}

/** How much of the video the playhead has reached, 0–100. */
export function watchedPercent(currentTime, duration) {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  if (!Number.isFinite(currentTime) || currentTime <= 0) return 0;
  return Math.min(100, (currentTime / duration) * 100);
}

// A saved position inside the last few seconds would resume straight into the
// end of the video (and into the lesson's auto-advance), so it restarts instead.
export const RESUME_END_GUARD_SECONDS = 10;

/**
 * Where to resume a video from, given the position saved for it.
 *
 * `duration` is 0 until YouTube has loaded the video's metadata; an unknown
 * duration keeps the saved position, and the player re-checks once it is known.
 */
export function resolveResumeTime(savedSeconds, duration = 0) {
  const saved = Number.isFinite(savedSeconds) ? Math.floor(savedSeconds) : 0;
  if (saved <= 0) return 0;
  if (Number.isFinite(duration) && duration > 0 && saved >= duration - RESUME_END_GUARD_SECONDS) return 0;
  return saved;
}

/** The speeds the settings menu offers, when the video supports them. */
export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

/** The offered speeds YouTube reports as available for this video. Always includes 1. */
export function pickPlaybackRates(availableRates) {
  const available = Array.isArray(availableRates) ? availableRates : [];
  const rates = PLAYBACK_RATES.filter((rate) => rate === 1 || available.includes(rate));
  return rates.length > 0 ? rates : [1];
}

const YOUTUBE_QUALITY_LABELS = {
  highres: "4K+",
  hd2880: "2880p",
  hd2160: "2160p",
  hd1440: "1440p",
  hd1080: "1080p",
  hd720: "720p",
  large: "480p",
  medium: "360p",
  small: "240p",
  tiny: "144p",
};

/** YouTube's quality name ("hd720") as a student reads it ("720p"); null when unknown. */
export function youtubeQualityLabel(quality) {
  return YOUTUBE_QUALITY_LABELS[quality] || null;
}

/**
 * Which error state a YouTube IFrame API error code maps to.
 *   2            the video id is malformed
 *   100          removed or private
 *   101 / 150    the owner does not allow embedded playback
 *   anything else (5 = HTML5 player error) is a playback failure worth a retry
 */
export function youtubeErrorKind(code) {
  if (code === 2) return "invalid";
  if (code === 100 || code === 101 || code === 150) return "unavailable";
  return "playback";
}

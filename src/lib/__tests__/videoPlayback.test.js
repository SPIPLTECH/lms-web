import { getYouTubeVideoId, isYouTubeHostUrl, isYouTubeUrl } from "../youtube.js";
import {
  formatVideoTime,
  pickPlaybackRates,
  resolveResumeTime,
  watchedPercent,
  youtubeErrorKind,
  youtubeQualityLabel,
} from "../videoPlayback.js";

// The lesson video player's pure helpers: YouTube URL parsing and the
// playback arithmetic OrangeVideoPlayer relies on.

function runTests() {
  const ID = "dQw4w9WgXcQ";

  const testCases = [
    // --- URL parsing -------------------------------------------------------
    ["watch URL", () => getYouTubeVideoId(`https://www.youtube.com/watch?v=${ID}`), ID],
    ["watch URL with other params first", () => getYouTubeVideoId(`https://www.youtube.com/watch?list=PL1&v=${ID}&t=30s`), ID],
    ["mobile watch URL", () => getYouTubeVideoId(`https://m.youtube.com/watch?v=${ID}`), ID],
    ["short youtu.be URL", () => getYouTubeVideoId(`https://youtu.be/${ID}?si=abc`), ID],
    ["embed URL", () => getYouTubeVideoId(`https://www.youtube.com/embed/${ID}`), ID],
    ["privacy-enhanced embed URL", () => getYouTubeVideoId(`https://www.youtube-nocookie.com/embed/${ID}`), ID],
    ["Shorts URL", () => getYouTubeVideoId(`https://www.youtube.com/shorts/${ID}`), ID],
    ["live URL", () => getYouTubeVideoId(`https://www.youtube.com/live/${ID}`), ID],
    ["invalid: id too short", () => getYouTubeVideoId("https://www.youtube.com/watch?v=abc123"), null],
    ["invalid: channel page", () => getYouTubeVideoId("https://www.youtube.com/@orangetree"), null],
    ["invalid: another site", () => getYouTubeVideoId(`https://vimeo.com/${ID}`), null],
    ["invalid: empty", () => getYouTubeVideoId(""), null],
    ["invalid: null", () => getYouTubeVideoId(null), null],
    ["isYouTubeUrl needs a readable id", () => isYouTubeUrl("https://www.youtube.com/@orangetree"), false],

    // --- which links the YouTube player claims ------------------------------
    ["host: a YouTube link with no readable id is still YouTube", () => isYouTubeHostUrl("https://www.youtube.com/watch?v=abc123"), true],
    ["host: youtu.be", () => isYouTubeHostUrl(`https://youtu.be/${ID}`), true],
    ["host: scheme-less link", () => isYouTubeHostUrl(`youtube.com/watch?v=${ID}`), true],
    ["host: an uploaded file is not YouTube", () => isYouTubeHostUrl("https://blob.example.com/videos/youtube.com-intro.mp4"), false],
    ["host: a look-alike domain is not YouTube", () => isYouTubeHostUrl(`https://notyoutube.com/watch?v=${ID}`), false],
    ["host: non-string", () => isYouTubeHostUrl(undefined), false],

    // --- time display ------------------------------------------------------
    ["formats seconds as m:ss", () => formatVideoTime(65), "1:05"],
    ["formats an hour as h:mm:ss", () => formatVideoTime(3725), "1:02:05"],
    ["formats fractional seconds down", () => formatVideoTime(59.9), "0:59"],
    ["formats an unknown time as 0:00", () => formatVideoTime(NaN), "0:00"],
    ["formats a negative time as 0:00", () => formatVideoTime(-4), "0:00"],

    // --- watched percentage -------------------------------------------------
    ["percent: halfway", () => watchedPercent(50, 200), 25],
    ["percent: never above 100", () => watchedPercent(250, 200), 100],
    ["percent: unknown duration is 0", () => watchedPercent(50, 0), 0],

    // --- resume ------------------------------------------------------------
    ["resume: nothing saved starts at 0", () => resolveResumeTime(0, 600), 0],
    ["resume: mid-video resumes there", () => resolveResumeTime(123.7, 600), 123],
    ["resume: unknown duration keeps the saved position", () => resolveResumeTime(123, 0), 123],
    ["resume: saved in the last seconds restarts", () => resolveResumeTime(595, 600), 0],
    ["resume: saved past the end restarts", () => resolveResumeTime(900, 600), 0],
    ["resume: junk input starts at 0", () => resolveResumeTime(undefined, 600), 0],

    // --- settings ----------------------------------------------------------
    ["rates: only those YouTube reports, in order", () => pickPlaybackRates([0.25, 0.5, 1, 1.5, 2]), [0.5, 1, 1.5, 2]],
    ["rates: always offers normal speed", () => pickPlaybackRates([]), [1]],
    ["rates: tolerates a missing list", () => pickPlaybackRates(undefined), [1]],
    ["quality: hd720 reads 720p", () => youtubeQualityLabel("hd720"), "720p"],
    ["quality: unknown names are not shown", () => youtubeQualityLabel("unknown"), null],

    // --- error states ------------------------------------------------------
    ["error 2 is an invalid video", () => youtubeErrorKind(2), "invalid"],
    ["error 100 is unavailable (removed/private)", () => youtubeErrorKind(100), "unavailable"],
    ["error 101 is unavailable (embedding disabled)", () => youtubeErrorKind(101), "unavailable"],
    ["error 150 is unavailable (embedding disabled)", () => youtubeErrorKind(150), "unavailable"],
    ["error 5 is a retryable playback error", () => youtubeErrorKind(5), "playback"],
  ];

  let passed = 0;
  let failed = 0;

  testCases.forEach(([name, run, expected]) => {
    const actual = run();
    if (JSON.stringify(actual) === JSON.stringify(expected)) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}`);
      console.error("  Expected:", expected);
      console.error("  Actual:  ", actual);
      failed++;
    }
  });

  console.log(`\nRESULTS: ${passed} Passed, ${failed} Failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

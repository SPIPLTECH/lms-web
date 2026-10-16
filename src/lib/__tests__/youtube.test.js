import { getYouTubeVideoId, isYouTubeUrl } from "../youtube.js";

/**
 * getYouTubeVideoId is the single parser behind resolveVideoSource(), which is
 * what both the instructor composer and the student learn page render through.
 * If it stops reading one of the URL shapes an instructor can paste, that video
 * silently stops being an embed and becomes a broken <video> element instead.
 *
 * isYouTubeUrl exists to tell "a YouTube link we can't play" (playlist,
 * channel, mistyped id) apart from "someone else's direct media file" — the
 * two are otherwise indistinguishable to the resolver.
 */

const ID = "wRejGDZKJiM";
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function runTests() {
  const cases = [];

  // ── The five supported URL shapes, all pointing at the same video ────────
  const supported = {
    "standard watch URL": "https://www.youtube.com/watch?v=wRejGDZKJiM",
    "short youtu.be URL": "https://youtu.be/wRejGDZKJiM",
    "embed URL": "https://www.youtube.com/embed/wRejGDZKJiM",
    "shorts URL": "https://www.youtube.com/shorts/wRejGDZKJiM",
    "/v/ URL": "https://www.youtube.com/v/wRejGDZKJiM",
  };

  for (const [name, url] of Object.entries(supported)) {
    cases.push({ name: `${name} resolves to the video id`, run: () => getYouTubeVideoId(url), expected: ID });
  }

  // ── Query strings a real paste carries ──────────────────────────────────
  cases.push({
    name: "youtu.be share link keeps its ?si= tracking param out of the id",
    run: () => getYouTubeVideoId("https://youtu.be/wRejGDZKJiM?si=UGX7S_nInxL7ueAP"),
    expected: ID,
  });
  cases.push({
    name: "watch URL with params before and after v=",
    run: () => getYouTubeVideoId("https://www.youtube.com/watch?app=desktop&v=wRejGDZKJiM&t=30s"),
    expected: ID,
  });
  cases.push({
    name: "mobile subdomain resolves like the desktop host",
    run: () => getYouTubeVideoId("https://m.youtube.com/watch?v=wRejGDZKJiM"),
    expected: ID,
  });
  cases.push({
    name: "nocookie embed (what we render) parses back to the same id",
    run: () => getYouTubeVideoId("https://www.youtube-nocookie.com/embed/wRejGDZKJiM?rel=0"),
    expected: ID,
  });

  // ── Non-YouTube sources must NOT be claimed ─────────────────────────────
  cases.push({
    name: "a direct MP4 is not a YouTube URL",
    run: () => [getYouTubeVideoId("https://cdn.example.com/lesson.mp4"), isYouTubeUrl("https://cdn.example.com/lesson.mp4")],
    expected: [null, false],
  });
  cases.push({
    name: "a Vimeo URL is not a YouTube URL",
    run: () => [getYouTubeVideoId("https://vimeo.com/123456789"), isYouTubeUrl("https://vimeo.com/123456789")],
    expected: [null, false],
  });
  cases.push({
    name: "a lookalike host is not a YouTube URL",
    run: () => isYouTubeUrl("https://notyoutube.com/watch?v=wRejGDZKJiM"),
    expected: false,
  });
  cases.push({
    name: "empty and non-URL input are handled without throwing",
    run: () => [getYouTubeVideoId(""), getYouTubeVideoId(null), getYouTubeVideoId("not a url"), isYouTubeUrl(null)],
    expected: [null, null, null, false],
  });

  // ── Unreadable YouTube links: no id, but still recognisably YouTube ─────
  cases.push({
    name: "an over-long id is rejected, not truncated to a different real video",
    run: () => getYouTubeVideoId("https://youtu.be/wRejGDZKJiMEXTRAJUNK"),
    expected: null,
  });
  cases.push({
    name: "a too-short id is rejected",
    run: () => getYouTubeVideoId("https://www.youtube.com/watch?v=abc123"),
    expected: null,
  });
  cases.push({
    name: "a playlist link has no video id but is still a YouTube link",
    run: () => [getYouTubeVideoId("https://www.youtube.com/playlist?list=PLabc123"), isYouTubeUrl("https://www.youtube.com/playlist?list=PLabc123")],
    expected: [null, true],
  });
  cases.push({
    name: "a channel link has no video id but is still a YouTube link",
    run: () => [getYouTubeVideoId("https://www.youtube.com/@somechannel"), isYouTubeUrl("https://www.youtube.com/@somechannel")],
    expected: [null, true],
  });

  let passed = 0;
  let failed = 0;
  console.log("=== RUNNING YOUTUBE RESOLVER TESTS ===");
  for (const tc of cases) {
    const actual = tc.run();
    if (same(actual, tc.expected)) {
      console.log(`[PASS] ${tc.name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${tc.name}`);
      console.error("  Expected:", JSON.stringify(tc.expected));
      console.error("  Actual:  ", JSON.stringify(actual));
      failed++;
    }
  }
  console.log(`\nRESULTS: ${passed} Passed, ${failed} Failed`);
  if (failed > 0) process.exit(1);
}

runTests();

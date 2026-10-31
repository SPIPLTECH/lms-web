import { answerFingerprint, answerRetryDelay, changedQuestionIds, classifyExamError, formatSavedAnswer, isDevToolsShortcut, isLeaveShortcut, isScreenshotShortcut, localDeadlineMs, refusalMessage, toSavePayload } from "../proctoring/examLogic.js";
import { VoiceActivityDetector, crossingsPerSecond, frameLevelDb } from "../proctoring/voiceActivity.js";

/**
 * The proctored exam page's decisions that need no browser, and the voice detector copied
 * from ProctorGuard. The screens themselves are exercised in a real browser.
 */
let failed = 0;
const check = (name, ok) => {
    console.log(`${ok ? "[PASS]" : "[FAIL]"} ${name}`);
    if (!ok) failed += 1;
};
const http = (status, code) => ({ response: { status, data: { code } } });

// ---- shortcuts ----
check("Alt+Tab, the Windows key, Esc and Ctrl+W count as leaving", [{ key: "Tab", altKey: true }, { key: "Meta" }, { key: "Escape" }, { key: "w", ctrlKey: true }].every(isLeaveShortcut));
check("ordinary typing does not", ![{ key: "a" }, { key: "Tab" }, { key: "Enter" }, { key: "w" }].some(isLeaveShortcut));
check("PrintScreen and the snipping shortcut are screenshots", Boolean(isScreenshotShortcut({ key: "PrintScreen" })) && Boolean(isScreenshotShortcut({ key: "S", shiftKey: true, metaKey: true })));
check("Ctrl+P is treated as a screenshot, Ctrl+Shift+P is not", Boolean(isScreenshotShortcut({ key: "p", ctrlKey: true })) && !isScreenshotShortcut({ key: "p", ctrlKey: true, shiftKey: true }));
check("a plain letter is not a screenshot", !isScreenshotShortcut({ key: "s" }));
check("F12 and Ctrl+Shift+I are developer tools", isDevToolsShortcut({ key: "F12" }) && isDevToolsShortcut({ key: "I", ctrlKey: true, shiftKey: true }));

// ---- what an error means ----
check("an ended attempt ends the page", classifyExamError(http(409, "ATTEMPT_ENDED")) === "ENDED" && classifyExamError(http(409, "TIME_EXPIRED")) === "ENDED");
check("another tab or device supersedes this one", classifyExamError(http(409, "TOKEN_SUPERSEDED")) === "SUPERSEDED" && classifyExamError(http(409, "ATTEMPT_ACTIVE_ON_ANOTHER_DEVICE")) === "SUPERSEDED");
check("a token that no longer works offers a way back, not a dead end", classifyExamError(http(401, "MONITORING_TOKEN_INVALID")) === "SUPERSEDED");
check("a recheck goes to the recheck screen", classifyExamError(http(409, "IDENTITY_RECHECK_REQUIRED")) === "RECHECK");
check("a network failure retries", classifyExamError(new Error("Network Error")) === "RETRY" && classifyExamError(http(503)) === "RETRY" && classifyExamError(http(429)) === "RETRY");
check("a refusal does not retry forever", classifyExamError(http(403)) === "FATAL" && classifyExamError(http(400)) === "FATAL");
check("retries back off and stop growing", answerRetryDelay(0) === 1000 && answerRetryDelay(1) === 2000 && answerRetryDelay(50) === 15000);

// ---- what needs saving ----
const answered = { questionId: "q1", answer: "right", answered: true, visited: true, status: "ANSWERED", hintViewed: false };
const visitedOnly = { questionId: "q2", answer: null, answered: false, visited: true, status: "VISITED" };
const untouched = { questionId: "q3", answer: null, answered: false, visited: false, status: "NOT_VISITED" };
check("touched questions need saving, untouched ones do not", JSON.stringify(changedQuestionIds({ q1: answered, q2: visitedOnly, q3: untouched }, {})) === JSON.stringify(["q1", "q2"]));
check("what the server has does not need saving again", changedQuestionIds({ q1: answered }, { q1: answerFingerprint(answered) }).length === 0);
check("changing an answer needs saving", changedQuestionIds({ q1: { ...answered, answer: "wrong" } }, { q1: answerFingerprint(answered) }).length === 1);
check("skipping needs saving", changedQuestionIds({ q1: { ...visitedOnly, questionId: "q1", skipped: true, status: "SKIPPED" } }, { q1: answerFingerprint({ ...visitedOnly, questionId: "q1" }) }).length === 1);

const payload = toSavePayload({ ...answered, firstVisitedAt: 1000, answeredAt: 2000 }, 7);
check("a save carries the answer and revision", payload.answer === "right" && payload.clientRevision === 7);
check("times go as ISO dates, and missing ones as null", payload.state.firstVisitedAt === new Date(1000).toISOString() && payload.state.skippedAt === null);
check("an unanswered question saves null, whatever its record holds", toSavePayload({ ...visitedOnly, answer: "stale" }, 1).answer === null);

// ---- the clock ----
const received = Date.parse("2026-10-31T10:00:00.000Z");
check("a correct local clock changes nothing", localDeadlineMs("2026-10-31T11:00:00.000Z", "2026-10-31T10:00:00.000Z", received) === Date.parse("2026-10-31T11:00:00.000Z"));
check("a local clock an hour fast gets the same hour of exam", localDeadlineMs("2026-10-31T11:00:00.000Z", "2026-10-31T09:00:00.000Z", received) - received === 2 * 3600 * 1000);
check("a local clock an hour slow gets the same hour of exam", localDeadlineMs("2026-10-31T11:00:00.000Z", "2026-10-31T10:30:00.000Z", received) - received === 30 * 60 * 1000);
check("no deadline, no countdown", localDeadlineMs(null, "2026-10-31T10:00:00.000Z") === null);

// ---- words ----
check("answers read as words", formatSavedAnswer("right") === "right" && formatSavedAnswer(["a", "b"]) === "a, b" && formatSavedAnswer({ left: "right" }) === "left → right" && formatSavedAnswer(null) === "");
check("every refusal the server can send has wording", ["PROCTORING_UNAVAILABLE", "NO_ATTEMPTS_LEFT", "RETAKE_APPROVAL_REQUIRED"].every((reason) => Boolean(refusalMessage(reason))));
check("an unknown refusal has none, rather than a wrong one", refusalMessage("SOMETHING_ELSE") === null);

// ---- voice detection ----
const SAMPLE_RATE = 48000;
const tone = (frequency, amplitude, size = 2048) => Float32Array.from({ length: size }, (_, i) => amplitude * Math.sin((2 * Math.PI * frequency * i) / SAMPLE_RATE));
const silence = new Float32Array(2048);
check("silence measures as the floor", frameLevelDb(silence) === -100);
check("a full-scale tone is close to -3 dBFS", Math.abs(frameLevelDb(tone(440, 1)) + 3) < 0.2);
check("zero crossings follow the pitch", Math.abs(crossingsPerSecond(tone(1000, 1), SAMPLE_RATE) - 2000) < 60);

const run = (frames, options = {}) => {
    const detector = new VoiceActivityDetector({ sampleRate: SAMPLE_RATE, minSpeechMs: 1500, cooldownMs: 30000, ...options });
    const reports = [];
    let now = 0;
    for (const frame of frames) {
        const report = detector.push(frame, now);
        if (report) reports.push(report);
        now += 100;
    }
    return reports;
};
const quiet = tone(300, 0.001);
const speech = tone(300, 0.2);
const repeat = (frame, count) => Array.from({ length: count }, () => frame);
check("speech long enough is reported once, as numbers only", (() => {
    const reports = run([...repeat(quiet, 15), ...repeat(speech, 25)]);
    return reports.length === 1 && Object.keys(reports[0]).sort().join() === "durationMs,levelDb,speechRatio";
})());
check("a short sound is not", run([...repeat(quiet, 15), ...repeat(speech, 5), ...repeat(quiet, 10)]).length === 0);
check("mains hum is not speech", run([...repeat(quiet, 15), ...repeat(tone(30, 0.2), 25)]).length === 0);
check("constant background noise is learned as the room", run(repeat(speech, 40)).length === 0);
check("the cooldown holds a second report back", run([...repeat(quiet, 15), ...repeat(speech, 25), ...repeat(quiet, 10), ...repeat(speech, 25)]).length === 1);

if (failed > 0) process.exit(1);

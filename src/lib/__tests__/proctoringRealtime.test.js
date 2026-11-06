import {
    describeExamEnding,
    isVisitOnlyChange,
    nextCaptureSlot,
    noticeRetryDelay,
    resultRetryDelay,
    shouldRetryResult,
    startReadinessProblem,
} from "../proctoring/examLogic.js";
import { createCaptureGuard } from "../proctoring/screenCapture.js";
import { enterExamLock, examLockState, relockExamKeyboard, releaseExamLock } from "../proctoring/examLock.js";
import { fullscreenExitDetail } from "../proctoring/reviewLabels.js";

/**
 * What decides how quickly and how honestly the exam page behaves. The real browser's part of this
 * is exercised by scripts/proctoring-e2e.
 */
let failed = 0;
const check = (name, ok) => {
    console.log(`${ok ? "[PASS]" : "[FAIL]"} ${name}`);
    if (!ok) failed += 1;
};
const http = (status, code) => ({ response: { status, data: { code } } });

// ---- the capture grid ----
{
    const steps = [];
    let slot = 1000;
    for (let i = 0; i < 4; i += 1) {
        // Each frame takes a different time, and the grid must not care.
        const now = slot + [85, 300, 12, 900][i];
        const next = nextCaptureSlot(slot, 5000, now);
        steps.push(next.slot - slot);
        check(`the timer waits only what is left of the interval (${i + 1})`, next.delayMs === next.slot - now);
        slot = next.slot;
    }
    check("frames stay exactly one interval apart, whatever each one cost", steps.every((step) => step === 5000));
    const late = nextCaptureSlot(1000, 5000, 17_500);
    check("a stalled tab skips the frames it missed rather than sending them in a burst", late.slot === 21_000 && late.delayMs === 3500);
    check("a change of interval takes effect from the last frame", nextCaptureSlot(1000, 15_000, 1100).slot === 16_000);
}

// ---- how an exam ended ----
{
    const reason = "Maximum proctoring warning limit reached (3/3). Your exam has been ended.";
    const proctored = describeExamEnding({ outcome: "ENDED_BY_PROCTORING", endedBy: "PROCTORING", reason, passed: false });
    check("proctoring: says so, with the server's exact reason", proctored.kind === "PROCTORING" && proctored.detail === reason && /proctoring/i.test(proctored.title) && /automatic/i.test(proctored.how));
    check("proctoring with no reason on record still says something", Boolean(describeExamEnding({ outcome: "ENDED_BY_PROCTORING", endedBy: "PROCTORING", reason: null }).detail));
    const submitted = describeExamEnding({ outcome: "PASSED", endedBy: "STUDENT", reason: null, passed: true });
    check("submitted and passed", submitted.kind === "STUDENT" && submitted.title === "Exam passed" && /you/i.test(submitted.how));
    check("submitted and not passed", describeExamEnding({ endedBy: "STUDENT", passed: false }).title === "Exam completed");
    const timed = describeExamEnding({ endedBy: "TIME", passed: true });
    check("time expired is its own ending, even with a passing score", timed.kind === "TIME" && timed.title === "Time expired" && /time/i.test(timed.how));
    const other = describeExamEnding({ endedBy: null, outcome: "ABANDONED", reason: null });
    check("anything else is neutral, and never claims proctoring or the student did it", other.kind === "OTHER" && !/proctoring|you/i.test(other.how));
    check("a voided attempt says so", describeExamEnding({ outcome: "VOIDED", endedBy: "STUDENT", passed: true }).title === "Attempt voided");
}

// ---- starting ----
{
    const good = { cameraLive: true, captureSessions: 0, recordingClosedConfirmed: true };
    check("everything in order: nothing stops the start", startReadinessProblem(good) === null);
    check("a capture running stops the start and says so", /screen capture/i.test(startReadinessProblem({ ...good, captureSessions: 1 }) || ""));
    check("a camera that has died stops the start and says so", /camera/i.test(startReadinessProblem({ ...good, cameraLive: false }) || ""));
    check("no confirmation stops the start", /confirm/i.test(startReadinessProblem({ ...good, recordingClosedConfirmed: false }) || ""));
    check("a capture is reported ahead of the confirmation it makes untrue", /screen capture/i.test(startReadinessProblem({ cameraLive: true, captureSessions: 1, recordingClosedConfirmed: false }) || ""));
}

// ---- reading the result while the record catches up ----
check("a result not ready yet is asked for again, for a good while", shouldRetryResult(10, http(409, "ATTEMPT_NOT_ENDED")) && !shouldRetryResult(60, http(409, "ATTEMPT_NOT_ENDED")));
check("any other failure gets the usual two tries", shouldRetryResult(1, http(500)) && !shouldRetryResult(2, http(500)));
check("not ready is asked for again quickly, a server error is not", resultRetryDelay(0, http(409, "ATTEMPT_NOT_ENDED")) <= 1000 && resultRetryDelay(1, http(500)) >= 1000);
check("the notice channel backs off when it fails, up to a limit", noticeRetryDelay(0) === 1000 && noticeRetryDelay(1) === 2000 && noticeRetryDelay(50) <= 15000);

// ---- saves ----
check("a question only visited can wait", isVisitOnlyChange({ visited: true, answered: false, skipped: false, hintViewed: false }));
check("an answer, a skip or a hint cannot", ![{ visited: true, answered: true }, { visited: true, skipped: true }, { visited: true, hintViewed: true }].some(isVisitOnlyChange));

// ---- reading a fullscreen exit, for the instructor ----
check("a held Esc under Keyboard Lock is described", /Esc held for 1\.6 s/.test(fullscreenExitDetail({ escHeldMs: 1600, keyboardLock: "active" }) || "") && /keyboard lock on/i.test(fullscreenExitDetail({ escHeldMs: 1600, keyboardLock: "active" })));
check("a browser that refused the lock is described", /keyboard lock not available/i.test(fullscreenExitDetail({ escHeldMs: null, keyboardLock: "refused" }) || ""));
check("an old event with neither says nothing", fullscreenExitDetail({}) === null && fullscreenExitDetail(undefined) === null);

// ---- the capture guard ----
const fakeTrack = () => {
    const listeners = new Set();
    return {
        readyState: "live",
        addEventListener: (_, listener) => listeners.add(listener),
        end() {
            this.readyState = "ended";
            listeners.forEach((listener) => listener());
        },
    };
};
const fakeDevices = (track) => ({
    calls: 0,
    async getDisplayMedia() {
        this.calls += 1;
        return { getVideoTracks: () => [track], getTracks: () => [track] };
    },
});

{
    const track = fakeTrack();
    const devices = fakeDevices(track);
    const guard = createCaptureGuard(devices);
    guard.install();
    guard.install();
    const seen = [];
    const unsubscribe = guard.subscribe(() => seen.push(guard.activeSessions()));
    check("the guard knows the browser can share a screen", guard.supported() === true);
    check("nothing running to begin with", guard.activeSessions() === 0);
    await devices.getDisplayMedia({ video: true });
    check("a capture this page started is seen, however many times the guard is installed", guard.activeSessions() === 1 && devices.calls === 1);
    track.end();
    check("stopping it clears it, and whoever is listening hears", guard.activeSessions() === 0 && seen.join() === "1,0");
    unsubscribe();

    const reported = [];
    const stopRefusing = guard.refuseNew(() => reported.push("refused"));
    const refused = await devices.getDisplayMedia({ video: true }).then(() => null, (error) => error);
    check("while refusing: no capture starts, it is reported, and the browser is never asked", refused?.name === "NotAllowedError" && reported.length === 1 && devices.calls === 1 && guard.activeSessions() === 0);
    stopRefusing();
    await devices.getDisplayMedia({ video: true });
    check("after refusing: captures work again", devices.calls === 2);

    const noApi = createCaptureGuard({});
    noApi.install();
    check("a browser with no screen sharing has nothing to see, and no error", noApi.supported() === false && noApi.activeSessions() === 0);
}

// ---- the exam lock ----
const installBrowser = ({ lock, fullscreen = false }) => {
    const doc = {
        fullscreenElement: fullscreen ? {} : null,
        fullscreenEnabled: true,
        documentElement: {
            async requestFullscreen() {
                doc.fullscreenElement = {};
            },
        },
        async exitFullscreen() {
            doc.fullscreenElement = null;
        },
    };
    globalThis.document = doc;
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: { keyboard: lock === undefined ? undefined : { lock, unlock() {} } } });
    return doc;
};

installBrowser({ lock: async () => undefined });
{
    const state = await enterExamLock();
    check("fullscreen, then the keyboard lock", state.fullscreen === true && state.keyboardLocked === true && examLockState().keyboardLock === "active");
}

installBrowser({ lock: () => Promise.reject(new DOMException("refused", "NotAllowedError")) });
{
    const state = await enterExamLock();
    check("a refused lock is recorded as refused, and the exam still goes fullscreen", state.fullscreen === true && state.keyboardLocked === false && examLockState().keyboardLock === "refused");
}

installBrowser({ lock: undefined });
{
    await enterExamLock();
    check("a browser with no keyboard lock is recorded as such", examLockState().keyboardLock === "unsupported");
}

installBrowser({ lock: () => new Promise(() => {}) });
{
    const at = Date.now();
    const state = await enterExamLock({ lockWaitMs: 40 });
    check("a lock that never answers cannot hold up the exam", Date.now() - at < 500 && state.fullscreen === true && state.keyboardLocked === false && examLockState().keyboardLock === "pending");
}

{
    let answer;
    installBrowser({ lock: () => new Promise((resolve) => { answer = resolve; }) });
    await enterExamLock({ lockWaitMs: 10 });
    answer();
    await new Promise((resolve) => setTimeout(resolve, 5));
    check("a lock that answers late still counts", examLockState().keyboardLock === "active");
}

{
    let calls = 0;
    const doc = installBrowser({ lock: async () => { calls += 1; } });
    await enterExamLock();
    await relockExamKeyboard();
    check("an active lock is not asked for again", calls === 1);
    doc.fullscreenElement = null;
    releaseExamLock();
    check("released on purpose: the page knows not to restore", examLockState().released === true && examLockState().keyboardLock === "off");
    await relockExamKeyboard();
    check("released on purpose: nothing locks again", calls === 1);
    await enterExamLock();
    check("a new exam lock clears that", examLockState().released === false && calls === 2);
}

if (failed > 0) process.exit(1);

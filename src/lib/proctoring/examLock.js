/**
 * Exam lock: fullscreen and Keyboard Lock, which is what a web page can do. It is not a lockdown
 * browser. Copied from ProctorGuard.
 *
 * Fullscreen must start from a click, so callers invoke this from click handlers. Keyboard Lock
 * (Chrome and Edge, fullscreen only) delivers system shortcuts such as Esc, Alt+Tab and the
 * Windows key to the page, so the exam can block and record them. A student can still leave by
 * holding Esc for about 2 s, which no page can prevent, so leaving is detected, recorded, and the
 * exam is hidden until fullscreen returns.
 */

/** A lock request that never answers must not hold up an exam that is about to start. */
const LOCK_WAIT_MS = 1500;

let state = { keyboardLock: "off", released: false };

/** keyboardLock: off, active, pending, refused or unsupported. Goes on the record of every exit. */
export const examLockState = () => state;

const setKeyboardLock = (keyboardLock) => {
    state = { ...state, keyboardLock };
    return keyboardLock;
};

export const isFullscreenSupported = () =>
    typeof document !== "undefined" && Boolean(document.fullscreenEnabled && document.documentElement.requestFullscreen);

async function lockKeyboard(lockWaitMs) {
    if (!navigator.keyboard?.lock) return setKeyboardLock("unsupported");
    setKeyboardLock("pending");
    const request = navigator.keyboard.lock().then(
        () => {
            if (!state.released) setKeyboardLock("active");
        },
        () => {
            if (!state.released) setKeyboardLock("refused");
        }
    );
    let timer;
    const gaveUp = new Promise((resolve) => {
        timer = setTimeout(resolve, lockWaitMs);
    });
    await Promise.race([request, gaveUp]);
    clearTimeout(timer);
    return state.keyboardLock;
}

/** Call from a click handler. Never throws. */
export async function enterExamLock({ lockWaitMs = LOCK_WAIT_MS } = {}) {
    state = { ...state, released: false };
    let fullscreen = Boolean(document.fullscreenElement);
    if (!fullscreen && isFullscreenSupported()) {
        try {
            await document.documentElement.requestFullscreen({ navigationUI: "hide" });
            fullscreen = true;
        } catch {
            fullscreen = false;
        }
    }
    if (fullscreen) await lockKeyboard(lockWaitMs);
    return { fullscreen, keyboardLocked: state.keyboardLock === "active" };
}

/** Back in fullscreen, or back in focus, with no lock in place: asks again. Never throws. */
export async function relockExamKeyboard({ lockWaitMs = LOCK_WAIT_MS } = {}) {
    if (state.released || state.keyboardLock === "active" || state.keyboardLock === "pending" || !document.fullscreenElement) return state.keyboardLock;
    return lockKeyboard(lockWaitMs);
}

/** Releases the keyboard and leaves fullscreen. Never throws. */
export function releaseExamLock() {
    state = { keyboardLock: "off", released: true };
    try {
        navigator.keyboard?.unlock?.();
    } catch {
        // Nothing to undo.
    }
    if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
    }
}

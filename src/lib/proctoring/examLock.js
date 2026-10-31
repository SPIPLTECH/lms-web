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

export const isFullscreenSupported = () =>
    typeof document !== "undefined" && Boolean(document.fullscreenEnabled && document.documentElement.requestFullscreen);

/** Call from a click handler. Never throws. */
export async function enterExamLock() {
    let fullscreen = Boolean(document.fullscreenElement);
    if (!fullscreen && isFullscreenSupported()) {
        try {
            await document.documentElement.requestFullscreen({ navigationUI: "hide" });
            fullscreen = true;
        } catch {
            fullscreen = false;
        }
    }
    let keyboardLocked = false;
    if (fullscreen && navigator.keyboard?.lock) {
        try {
            await navigator.keyboard.lock();
            keyboardLocked = true;
        } catch {
            keyboardLocked = false;
        }
    }
    return { fullscreen, keyboardLocked };
}

/** Releases the keyboard and leaves fullscreen. Never throws. */
export function releaseExamLock() {
    try {
        navigator.keyboard?.unlock?.();
    } catch {
        // Nothing to undo.
    }
    if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
    }
}

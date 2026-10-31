"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { enterExamLock } from "@/lib/proctoring/examLock";
import { classifyExamError, isDevToolsShortcut, isLeaveShortcut, isScreenshotShortcut } from "@/lib/proctoring/examLogic";
import { sendExamEvent, sendExamHeartbeat } from "@/services/proctoring.service";

/** Focus must be away this long before it counts: permission prompts and OS toasts flicker focus. */
const BLUR_GRACE_MS = 1500;
const HEARTBEAT_MS = 15_000;
const SAME_EVENT_MS = 800;

const isTyping = (target) => target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;

/**
 * What the browser can notice during an exam, copied from ProctorGuard. It reports and shows
 * warnings; the server decides what they mean. Severity is the server's, so none is sent here.
 */
export default function useBrowserMonitoring({ token, active, initialWarnings = 0, maxWarnings: initialMax = 3, onEnded, onSuperseded, onIntervalChange }) {
    const [warnings, setWarnings] = useState(initialWarnings);
    const [maxWarnings, setMaxWarnings] = useState(initialMax);
    const [activeWarningMessage, setActiveWarningMessage] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(() => typeof document !== "undefined" && Boolean(document.fullscreenElement));
    const [isWindowFocused, setIsWindowFocused] = useState(() => (typeof document === "undefined" ? true : !document.hidden && document.hasFocus()));
    const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));

    const tokenRef = useRef(token);
    tokenRef.current = token;
    const handlers = useRef({});
    handlers.current = { onEnded, onSuperseded, onIntervalChange };
    const lastEventRef = useRef({});
    const lastScreenshotRef = useRef(0);
    const blurTimerRef = useRef(null);

    const handleFailure = useCallback((error) => {
        const kind = classifyExamError(error);
        if (kind === "ENDED") handlers.current.onEnded?.();
        else if (kind === "SUPERSEDED") handlers.current.onSuperseded?.();
    }, []);

    /** A decision the server made in the background: shows the warning, and leaves if it ended the exam. */
    const applyServerNotice = useCallback((notice) => {
        if (!notice) return;
        if (notice.warningIssued && notice.message) {
            if (typeof notice.currentWarnings === "number") setWarnings(notice.currentWarnings);
            if (typeof notice.maxWarnings === "number") setMaxWarnings(notice.maxWarnings);
            setActiveWarningMessage(notice.message);
        }
        if (notice.terminated) handlers.current.onEnded?.();
    }, []);

    const reportEvent = useCallback(
        async (eventType, metadata) => {
            if (!tokenRef.current) return;
            const now = Date.now();
            if (now - (lastEventRef.current[eventType] || 0) < SAME_EVENT_MS) return;
            lastEventRef.current[eventType] = now;
            try {
                const response = await sendExamEvent(tokenRef.current, { eventType, metadata, clientTimestamp: new Date().toISOString() });
                const policy = response?.policyResult;
                if (policy) {
                    setWarnings(policy.currentWarnings);
                    setMaxWarnings(policy.maxWarnings);
                    if (policy.warningIssued && policy.message) setActiveWarningMessage(policy.message);
                    if (policy.terminated) handlers.current.onEnded?.();
                }
            } catch (error) {
                handleFailure(error);
            }
        },
        [handleFailure]
    );

    useEffect(() => {
        if (!active) return undefined;
        const ping = async () => {
            try {
                const response = await sendExamHeartbeat(tokenRef.current);
                if (response?.proctoring) applyServerNotice(response.proctoring);
                if (typeof response?.nextIntervalSeconds === "number") handlers.current.onIntervalChange?.(response.nextIntervalSeconds);
            } catch (error) {
                handleFailure(error);
            }
        };
        ping();
        const timer = setInterval(ping, HEARTBEAT_MS);
        return () => clearInterval(timer);
    }, [active, applyServerNotice, handleFailure]);

    // Screen sharing is refused for the length of the exam.
    useEffect(() => {
        if (!active || !navigator.mediaDevices?.getDisplayMedia) return undefined;
        const original = navigator.mediaDevices.getDisplayMedia;
        navigator.mediaDevices.getDisplayMedia = async () => {
            reportEvent("SCREEN_SHARE_ATTEMPT", { reason: "Blocked a screen share request" });
            throw new DOMException("Screen sharing is not allowed during a proctored exam.", "NotAllowedError");
        };
        return () => {
            navigator.mediaDevices.getDisplayMedia = original;
        };
    }, [active, reportEvent]);

    useEffect(() => {
        if (!active) return undefined;

        // Fullscreen begins in the Start click, before these listeners exist.
        setIsFullscreen(Boolean(document.fullscreenElement));
        setIsWindowFocused(!document.hidden && document.hasFocus());

        const wipeClipboard = () => navigator.clipboard?.writeText?.("").catch?.(() => {});

        const onVisibility = () => {
            if (document.hidden) {
                setIsWindowFocused(false);
                wipeClipboard();
                reportEvent("TAB_HIDDEN", { reason: "Switched tabs or minimised the window" });
            } else {
                setIsWindowFocused(document.hasFocus());
                reportEvent("TAB_VISIBLE", { reason: "Returned to the exam tab" });
            }
        };
        const onBlur = () => {
            setIsWindowFocused(false);
            wipeClipboard();
            if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
            const leftAt = Date.now();
            blurTimerRef.current = setTimeout(() => {
                blurTimerRef.current = null;
                if (!document.hasFocus()) reportEvent("WINDOW_BLUR", { reason: "The exam window lost focus", awayMs: Date.now() - leftAt });
            }, BLUR_GRACE_MS);
        };
        const onFocus = () => {
            setIsWindowFocused(true);
            if (blurTimerRef.current) {
                // A brief flicker, not reported.
                clearTimeout(blurTimerRef.current);
                blurTimerRef.current = null;
                return;
            }
            reportEvent("WINDOW_FOCUS", { reason: "The exam window regained focus" });
        };
        const onFullscreen = () => {
            const on = Boolean(document.fullscreenElement);
            setIsFullscreen(on);
            reportEvent(on ? "FULLSCREEN_ENTER" : "FULLSCREEN_EXIT", { reason: on ? "Entered fullscreen" : "Left fullscreen" });
        };
        const blocked = (eventType, action) => (event) => {
            // A written answer needs ordinary editing.
            if (isTyping(event.target) && event.type !== "contextmenu") return;
            event.preventDefault();
            reportEvent(eventType, { action });
        };
        const onCopy = blocked("COPY_ATTEMPT", "Blocked a copy");
        const onPaste = blocked("PASTE_ATTEMPT", "Blocked a paste");
        const onCut = blocked("CUT_ATTEMPT", "Blocked a cut");
        const onContext = blocked("CONTEXT_MENU", "Blocked the right-click menu");

        const noteScreenshot = (shortcut, key) => {
            wipeClipboard();
            const now = Date.now();
            if (now - lastScreenshotRef.current > 1000) {
                lastScreenshotRef.current = now;
                reportEvent("SCREENSHOT_ATTEMPT", { key, shortcut, action: "Blocked a screenshot and cleared the clipboard" });
            }
        };
        const onKeyDown = (event) => {
            const screenshot = isScreenshotShortcut(event);
            if (screenshot) {
                event.preventDefault();
                event.stopPropagation();
                noteScreenshot(screenshot, event.key);
            } else if (isDevToolsShortcut(event) || isLeaveShortcut(event)) {
                event.preventDefault();
                event.stopPropagation();
            }
        };
        const onKeyUp = (event) => {
            // Windows often sends PrintScreen on key up only.
            if (event.key === "PrintScreen" || event.code === "PrintScreen" || event.keyCode === 44) {
                event.preventDefault();
                event.stopPropagation();
                noteScreenshot("PrintScreen", event.key);
            }
        };
        const onOnline = () => setIsOnline(true);
        const onOffline = () => {
            setIsOnline(false);
        };

        document.addEventListener("visibilitychange", onVisibility);
        window.addEventListener("blur", onBlur);
        window.addEventListener("focus", onFocus);
        document.addEventListener("fullscreenchange", onFullscreen);
        document.addEventListener("copy", onCopy);
        document.addEventListener("paste", onPaste);
        document.addEventListener("cut", onCut);
        document.addEventListener("contextmenu", onContext);
        window.addEventListener("keydown", onKeyDown, true);
        window.addEventListener("keyup", onKeyUp, true);
        window.addEventListener("online", onOnline);
        window.addEventListener("offline", onOffline);
        return () => {
            document.removeEventListener("visibilitychange", onVisibility);
            window.removeEventListener("blur", onBlur);
            window.removeEventListener("focus", onFocus);
            document.removeEventListener("fullscreenchange", onFullscreen);
            document.removeEventListener("copy", onCopy);
            document.removeEventListener("paste", onPaste);
            document.removeEventListener("cut", onCut);
            document.removeEventListener("contextmenu", onContext);
            window.removeEventListener("keydown", onKeyDown, true);
            window.removeEventListener("keyup", onKeyUp, true);
            window.removeEventListener("online", onOnline);
            window.removeEventListener("offline", onOffline);
            if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
        };
    }, [active, reportEvent]);

    /** Call from a click. */
    const requestFullscreen = useCallback(async () => {
        const state = await enterExamLock();
        setIsFullscreen(state.fullscreen);
        return state;
    }, []);

    return {
        warnings,
        maxWarnings,
        activeWarningMessage,
        clearWarningMessage: () => setActiveWarningMessage(null),
        isFullscreen,
        isWindowFocused,
        isOnline,
        requestFullscreen,
        applyServerNotice,
        reportEvent,
    };
}

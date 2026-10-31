"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { enterExamLock } from "@/lib/proctoring/examLock";
import {
    CONTINUOUS_WARNING_TYPES,
    classifyExamError,
    isDevToolsShortcut,
    isLeaveShortcut,
    isScreenshotShortcut,
    openWarningBanner,
    shouldDismissWarningBanner,
    syncWarningBannerConditions,
} from "@/lib/proctoring/examLogic";
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
    const safeInitialMax = initialMax > 0 ? initialMax : 3;
    const [warnings, setWarnings] = useState(() => Math.min(Math.max(0, initialWarnings), safeInitialMax));
    const [maxWarnings, setMaxWarnings] = useState(safeInitialMax);
    const [warningBanner, setWarningBanner] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(() => typeof document !== "undefined" && Boolean(document.fullscreenElement));
    const [isWindowFocused, setIsWindowFocused] = useState(() => (typeof document === "undefined" ? true : !document.hidden && document.hasFocus()));
    const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));

    const tokenRef = useRef(token);
    tokenRef.current = token;
    const maxWarningsRef = useRef(safeInitialMax);
    const serverConditionsRef = useRef([]);
    const clientConditionsRef = useRef(new Set());
    const handlers = useRef({});
    handlers.current = { onEnded, onSuperseded, onIntervalChange };
    const lastEventRef = useRef({});
    const lastScreenshotRef = useRef(0);
    const blurTimerRef = useRef(null);

    useEffect(() => {
        const resolvedMax = initialMax > 0 ? initialMax : 3;
        maxWarningsRef.current = resolvedMax;
        setMaxWarnings(resolvedMax);
        setWarnings(Math.min(Math.max(0, initialWarnings), resolvedMax));
    }, [initialWarnings, initialMax]);

    const getEffectiveConditions = useCallback(
        () => [...new Set([...serverConditionsRef.current, ...clientConditionsRef.current])],
        []
    );

    const syncCounts = useCallback((current, max) => {
        const resolvedMax = typeof max === "number" && max > 0 ? max : maxWarningsRef.current;
        if (typeof max === "number" && max > 0) {
            maxWarningsRef.current = max;
            setMaxWarnings(max);
        }
        if (typeof current === "number") {
            setWarnings(Math.min(Math.max(0, current), resolvedMax));
        }
    }, []);

    const showBanner = useCallback(
        (notice, fallbackEventType = null) => {
            if (!notice?.message) return;
            const eventType = notice.eventType ?? fallbackEventType ?? null;
            const now = Date.now();
            if (eventType === "CAMERA_INTERRUPTED" || eventType === "CAMERA_DENIED") {
                clientConditionsRef.current.add(eventType);
            } else if (eventType && CONTINUOUS_WARNING_TYPES.has(eventType) && !serverConditionsRef.current.includes(eventType)) {
                serverConditionsRef.current = [...serverConditionsRef.current, eventType];
            }
            const effective = getEffectiveConditions();
            setWarningBanner(() => {
                const opened = openWarningBanner(
                    {
                        message: notice.message,
                        eventType,
                        currentWarnings: notice.currentWarnings,
                        maxWarnings: notice.maxWarnings,
                    },
                    now
                );
                return syncWarningBannerConditions(opened, effective, now);
            });
        },
        [getEffectiveConditions]
    );

    const syncActiveConditions = useCallback(
        (conditions) => {
            if (!Array.isArray(conditions)) return;
            serverConditionsRef.current = conditions;
            const effective = getEffectiveConditions();
            setWarningBanner((current) => syncWarningBannerConditions(current, effective, Date.now()));
        },
        [getEffectiveConditions]
    );

    const resolveCondition = useCallback(
        (eventType) => {
            if (!eventType) return;
            clientConditionsRef.current.delete(eventType);
            serverConditionsRef.current = serverConditionsRef.current.filter((item) => item !== eventType);
            const effective = getEffectiveConditions();
            setWarningBanner((current) => syncWarningBannerConditions(current, effective, Date.now()));
        },
        [getEffectiveConditions]
    );

    useEffect(() => {
        if (!warningBanner || warningBanner.dismissAt === null) return undefined;
        const delay = Math.max(0, warningBanner.dismissAt - Date.now());
        const timer = setTimeout(() => {
            setWarningBanner((current) => (shouldDismissWarningBanner(current, Date.now()) ? null : current));
        }, delay + 25);
        return () => clearTimeout(timer);
    }, [warningBanner]);

    const handleFailure = useCallback((error) => {
        const kind = classifyExamError(error);
        if (kind === "ENDED") handlers.current.onEnded?.();
        else if (kind === "SUPERSEDED") handlers.current.onSuperseded?.();
    }, []);

    /** A decision the server made in the background: shows the warning, and leaves if it ended the exam. */
    const applyServerNotice = useCallback(
        (notice) => {
            if (!notice) return;
            syncCounts(notice.currentWarnings, notice.maxWarnings);
            if ((notice.warningIssued || notice.terminated) && notice.message) {
                showBanner(notice, notice.eventType ?? null);
            }
            if (notice.terminated) handlers.current.onEnded?.();
        },
        [showBanner, syncCounts]
    );

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
                    syncCounts(policy.currentWarnings, policy.maxWarnings);
                    if ((policy.warningIssued || policy.terminated) && policy.message) {
                        showBanner(policy, policy.eventType ?? eventType);
                    }
                    if (policy.terminated) handlers.current.onEnded?.();
                }
            } catch (error) {
                handleFailure(error);
            }
        },
        [handleFailure, showBanner, syncCounts]
    );

    useEffect(() => {
        if (!active) return undefined;
        const ping = async () => {
            try {
                const response = await sendExamHeartbeat(tokenRef.current);
                if (Array.isArray(response?.activeConditions)) syncActiveConditions(response.activeConditions);
                if (response?.proctoring) applyServerNotice(response.proctoring);
                if (typeof response?.nextIntervalSeconds === "number") handlers.current.onIntervalChange?.(response.nextIntervalSeconds);
            } catch (error) {
                handleFailure(error);
            }
        };
        ping();
        const timer = setInterval(ping, HEARTBEAT_MS);
        return () => clearInterval(timer);
    }, [active, applyServerNotice, handleFailure, syncActiveConditions]);

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

    const clearWarningMessage = useCallback(() => {
        setWarningBanner((current) => {
            if (!current) return null;
            if (current.continuous && current.resolvedAt === null) return current;
            return null;
        });
    }, []);

    const canDismissWarning = Boolean(warningBanner && (!warningBanner.continuous || warningBanner.resolvedAt !== null));

    return {
        warnings,
        maxWarnings,
        activeWarningMessage: warningBanner?.message ?? null,
        canDismissWarning,
        clearWarningMessage,
        syncActiveConditions,
        resolveCondition,
        isFullscreen,
        isWindowFocused,
        isOnline,
        requestFullscreen,
        applyServerNotice,
        reportEvent,
    };
}

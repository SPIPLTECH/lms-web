"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { classifyExamError, nextCaptureSlot } from "@/lib/proctoring/examLogic";
import { uploadExamFrame } from "@/services/proctoring.service";

/** Background captures retry on their own. The student hears only about a problem that lasts. */
const BACKGROUND_ERROR_AFTER_MS = 15_000;
const DEFAULT_INTERVAL_SECONDS = 5;
const JPEG_QUALITY = 0.85;
/** A frame due while another is uploading waits for it, briefly, rather than being lost. */
const BUSY_RETRY_MS = 250;
const BUSY_RETRIES = 8;

const newFrameId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

function cameraErrorMessage(error) {
    if (error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError") {
        return "Camera access was blocked. Allow the camera in your browser's settings for this site, then try again.";
    }
    if (error?.name === "NotFoundError" || error?.name === "DevicesNotFoundError") return "No camera was found on this device.";
    if (error?.name === "NotReadableError") return "Your camera is being used by another application. Close it, then try again.";
    return "Your camera could not be started. Check it is connected, then try again.";
}

/**
 * The webcam and the frames sent from it, copied from ProctorGuard with its 1.5 s loop removed:
 * one frame per server-set interval, plus a re-check when the server asks for one. Everything in
 * the background is silent. A message appears only when the student has to do something.
 */
export default function useWebcamCapture({ token, capturing = false, intervalSeconds = DEFAULT_INTERVAL_SECONDS, onResult, onEnded, onSuperseded, onRecheckRequired, onCameraLost, onCameraReady }) {
    const [cameraStatus, setCameraStatus] = useState("IDLE");
    const [errorMessage, setErrorMessage] = useState(null);

    const streamRef = useRef(null);
    const videoRef = useRef(null);
    const tokenRef = useRef(token);
    const intervalRef = useRef(intervalSeconds);
    const uploadingRef = useRef(false);
    const stoppedRef = useRef(false);
    const failingSinceRef = useRef(null);
    const shownErrorRef = useRef(false);
    const recheckTimerRef = useRef(null);
    const busyTimerRef = useRef(null);
    const canvasRef = useRef(null);
    const handlers = useRef({});
    handlers.current = { onResult, onEnded, onSuperseded, onRecheckRequired, onCameraLost, onCameraReady };

    useEffect(() => {
        tokenRef.current = token;
    }, [token]);
    useEffect(() => {
        intervalRef.current = intervalSeconds;
    }, [intervalSeconds]);

    /** A callback ref, so the same stream carries across the readiness and exam screens. */
    const attachVideo = useCallback((element) => {
        videoRef.current = element;
        if (element && streamRef.current) {
            element.srcObject = streamRef.current;
            element.play().catch(() => {});
        }
    }, []);

    const requestCamera = useCallback(async () => {
        if (!navigator.mediaDevices?.getUserMedia) {
            setCameraStatus("ERROR");
            setErrorMessage("This browser cannot use a camera. Use a current version of Chrome or Edge.");
            return false;
        }
        setCameraStatus("REQUESTING");
        setErrorMessage(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }, audio: false });
            streamRef.current?.getTracks().forEach((track) => track.stop());
            streamRef.current = stream;
            stream.getVideoTracks().forEach((track) => {
                track.addEventListener("ended", () => {
                    if (streamRef.current !== stream) return;
                    setCameraStatus("ERROR");
                    setErrorMessage("Your camera stopped. Reconnect it to continue. Your timer keeps running.");
                    handlers.current.onCameraLost?.("ended");
                });
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play().catch(() => {});
            }
            setCameraStatus("READY");
            handlers.current.onCameraReady?.();
            return true;
        } catch (error) {
            setCameraStatus(error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError" ? "DENIED" : "ERROR");
            setErrorMessage(cameraErrorMessage(error));
            handlers.current.onCameraLost?.(error?.name || "error");
            return false;
        }
    }, []);

    const stopCamera = useCallback(() => {
        stoppedRef.current = true;
        if (recheckTimerRef.current) clearTimeout(recheckTimerRef.current);
        if (busyTimerRef.current) clearTimeout(busyTimerRef.current);
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
        setCameraStatus("IDLE");
    }, []);

    /** Whether frames can really be taken now, checked again at the moment Start is pressed. */
    const isLive = useCallback(() => {
        const [track] = streamRef.current?.getVideoTracks() ?? [];
        return track?.readyState === "live" && (videoRef.current?.readyState ?? 0) >= 2;
    }, []);

    /** One canvas for the whole exam. An offscreen one encodes at once; a page canvas's toBlob waits for idle time. */
    const grabFrame = useCallback(async () => {
        const video = videoRef.current;
        if (!video || video.readyState < 2) return null;
        const width = video.videoWidth || 640;
        const height = video.videoHeight || 480;
        if (!canvasRef.current || canvasRef.current.width !== width || canvasRef.current.height !== height) {
            canvasRef.current = typeof OffscreenCanvas === "undefined" ? Object.assign(document.createElement("canvas"), { width, height }) : new OffscreenCanvas(width, height);
        }
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        if (!context) return null;
        context.drawImage(video, 0, 0, width, height);
        const capturedAt = new Date().toISOString();
        const blob = canvas.convertToBlob
            ? await canvas.convertToBlob({ type: "image/jpeg", quality: JPEG_QUALITY })
            : await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
        return blob ? { blob, capturedAt } : null;
    }, []);

    /** Takes and sends one frame. A student-initiated photo throws its failure; background ones never do. */
    const capture = useCallback(
        async (type, { foreground = false } = {}) => {
            if (stoppedRef.current || uploadingRef.current) return null;
            uploadingRef.current = true;
            try {
                const frame = await grabFrame();
                if (!frame) {
                    if (foreground) throw new Error("Your camera image is not ready yet. Please wait a moment and try again.");
                    throw Object.assign(new Error("frame unavailable"), { frameUnavailable: true });
                }
                const result = await uploadExamFrame(tokenRef.current, { type, blob: frame.blob, frameId: newFrameId(), capturedAt: frame.capturedAt });
                failingSinceRef.current = null;
                if (shownErrorRef.current) {
                    shownErrorRef.current = false;
                    setErrorMessage(null);
                }
                if (typeof result?.nextIntervalSeconds === "number") intervalRef.current = result.nextIntervalSeconds;
                handlers.current.onResult?.(result);
                return result;
            } catch (error) {
                const kind = classifyExamError(error);
                if (kind === "ENDED") {
                    stoppedRef.current = true;
                    handlers.current.onEnded?.();
                } else if (kind === "SUPERSEDED") {
                    stoppedRef.current = true;
                    handlers.current.onSuperseded?.();
                } else if (kind === "RECHECK") {
                    handlers.current.onRecheckRequired?.();
                } else if (foreground) {
                    throw error;
                } else {
                    // The next cycle is the retry. Shown only when it keeps failing.
                    failingSinceRef.current ??= Date.now();
                    if (Date.now() - failingSinceRef.current >= BACKGROUND_ERROR_AFTER_MS && !shownErrorRef.current) {
                        shownErrorRef.current = true;
                        setErrorMessage(
                            error?.frameUnavailable
                                ? "Your camera image is not available. Check that your camera is connected and not used by another application."
                                : "Exam monitoring is not reaching the server. Check your internet connection and keep this window open."
                        );
                        if (error?.frameUnavailable) handlers.current.onCameraLost?.("no-frames");
                    }
                }
                return null;
            } finally {
                uploadingRef.current = false;
            }
        },
        [grabFrame]
    );

    /** Never two uploads at once, and a frame due during one goes straight after it. */
    const captureWhenFree = useCallback(
        (type, retries = BUSY_RETRIES) => {
            if (stoppedRef.current) return;
            if (!uploadingRef.current) {
                capture(type);
                return;
            }
            if (retries > 0) busyTimerRef.current = setTimeout(() => captureWhenFree(type, retries - 1), BUSY_RETRY_MS);
        },
        [capture]
    );

    /** The server asked for another look at something suspicious. */
    const scheduleRecheck = useCallback(
        (delayMs) => {
            if (!delayMs || recheckTimerRef.current) return;
            recheckTimerRef.current = setTimeout(() => {
                recheckTimerRef.current = null;
                captureWhenFree("INCIDENT_SNAPSHOT");
            }, delayMs);
        },
        [captureWhenFree]
    );

    /** Something just happened that needs a photo of the moment. */
    const captureIncident = useCallback(() => captureWhenFree("INCIDENT_SNAPSHOT"), [captureWhenFree]);

    // One frame per interval, on a fixed grid. Nothing waits for an upload, so what one costs never
    // moves the next or holds up the page. The server can lengthen the interval under load.
    useEffect(() => {
        if (!capturing || cameraStatus !== "READY") return undefined;
        stoppedRef.current = false;
        let cancelled = false;
        let timer = null;
        let slot = Date.now();
        const tick = () => {
            if (cancelled || stoppedRef.current) return;
            captureWhenFree("PERIODIC_SNAPSHOT");
            const next = nextCaptureSlot(slot, Math.max(1, intervalRef.current) * 1000, Date.now());
            slot = next.slot;
            timer = setTimeout(tick, next.delayMs);
        };
        // The first frame goes at once, so monitoring is known to work from the start.
        tick();
        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
        };
    }, [capturing, cameraStatus, captureWhenFree]);

    useEffect(() => () => {
        if (recheckTimerRef.current) clearTimeout(recheckTimerRef.current);
        if (busyTimerRef.current) clearTimeout(busyTimerRef.current);
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
    }, []);

    return { attachVideo, cameraStatus, errorMessage, requestCamera, stopCamera, capture, captureIncident, scheduleRecheck, isLive };
}

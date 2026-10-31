"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { classifyExamError } from "@/lib/proctoring/examLogic";
import { uploadExamFrame } from "@/services/proctoring.service";

/** Background captures retry on their own. The student hears only about a problem that lasts. */
const BACKGROUND_ERROR_AFTER_MS = 15_000;
const DEFAULT_INTERVAL_SECONDS = 5;

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
export default function useWebcamCapture({ token, capturing = false, intervalSeconds = DEFAULT_INTERVAL_SECONDS, onResult, onEnded, onSuperseded, onRecheckRequired, onCameraLost }) {
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
    const handlers = useRef({});
    handlers.current = { onResult, onEnded, onSuperseded, onRecheckRequired, onCameraLost };

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
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
        setCameraStatus("IDLE");
    }, []);

    const grabFrame = useCallback(async () => {
        const video = videoRef.current;
        if (!video || video.readyState < 2) return null;
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const context = canvas.getContext("2d");
        if (!context) return null;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const capturedAt = new Date().toISOString();
        return new Promise((resolve) => {
            canvas.toBlob((blob) => resolve(blob ? { blob, capturedAt } : null), "image/jpeg", 0.85);
        });
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
                const recheck = result?.proctoring?.recheckInMs;
                if (recheck && !recheckTimerRef.current) {
                    recheckTimerRef.current = setTimeout(() => {
                        recheckTimerRef.current = null;
                        capture("INCIDENT_SNAPSHOT");
                    }, recheck);
                }
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

    // One loop, one frame per interval. The server can lengthen the interval under load.
    useEffect(() => {
        if (!capturing || cameraStatus !== "READY") return undefined;
        stoppedRef.current = false;
        let cancelled = false;
        let timer = null;
        const next = () => {
            timer = setTimeout(async () => {
                if (cancelled || stoppedRef.current) return;
                await capture("PERIODIC_SNAPSHOT");
                if (!cancelled && !stoppedRef.current) next();
            }, Math.max(1, intervalRef.current) * 1000);
        };
        // The first frame goes at once, so monitoring is known to work from the start.
        capture("PERIODIC_SNAPSHOT").finally(() => {
            if (!cancelled && !stoppedRef.current) next();
        });
        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
        };
    }, [capturing, cameraStatus, capture]);

    useEffect(() => () => {
        if (recheckTimerRef.current) clearTimeout(recheckTimerRef.current);
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
    }, []);

    return { attachVideo, cameraStatus, errorMessage, requestCamera, stopCamera, capture };
}

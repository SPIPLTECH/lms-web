"use client";

import { useEffect, useRef, useState } from "react";

import { VoiceActivityDetector } from "@/lib/proctoring/voiceActivity";

const FRAME_MS = 100;

/**
 * Browser voice detection on a microphone stream, copied from ProctorGuard. The stream feeds an
 * AnalyserNode only, never the speakers and never a recorder. Each frame is reduced to two
 * numbers and discarded, and only a summary of a speech segment is reported.
 */
export default function useVoiceActivity({ enabled, minSpeechMs = 1500, cooldownSeconds = 30, onVoiceActivity, onUnavailable }) {
    const [status, setStatus] = useState("UNKNOWN");
    const callbacks = useRef({});
    callbacks.current = { onVoiceActivity, onUnavailable };

    useEffect(() => {
        if (!enabled) return undefined;
        let cancelled = false;
        let stream = null;
        let context = null;
        let timer = null;

        const fail = (reason) => {
            if (cancelled) return;
            setStatus(reason === "NotAllowedError" || reason === "PermissionDeniedError" ? "DENIED" : "UNAVAILABLE");
            callbacks.current.onUnavailable?.(reason);
        };

        (async () => {
            const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
            if (!navigator.mediaDevices?.getUserMedia || !AudioContextClass) {
                fail("UNSUPPORTED");
                return;
            }
            setStatus("REQUESTING");
            try {
                // Noise suppression keeps fans out; automatic gain would distort the levels.
                stream = await navigator.mediaDevices.getUserMedia({ audio: { noiseSuppression: true, echoCancellation: false, autoGainControl: false }, video: false });
            } catch (error) {
                fail(error?.name || "Error");
                return;
            }
            if (cancelled) {
                stream.getTracks().forEach((track) => track.stop());
                return;
            }
            context = new AudioContextClass();
            context.resume?.().catch(() => {});
            const analyser = context.createAnalyser();
            analyser.fftSize = 2048;
            // Not connected to the destination, so nothing plays.
            context.createMediaStreamSource(stream).connect(analyser);
            const frame = new Float32Array(analyser.fftSize);
            const detector = new VoiceActivityDetector({ sampleRate: context.sampleRate, minSpeechMs, cooldownMs: cooldownSeconds * 1000 });
            setStatus("READY");
            timer = setInterval(() => {
                analyser.getFloatTimeDomainData(frame);
                const report = detector.push(frame, performance.now());
                if (report) callbacks.current.onVoiceActivity?.(report);
            }, FRAME_MS);
        })();

        return () => {
            cancelled = true;
            if (timer) clearInterval(timer);
            stream?.getTracks().forEach((track) => track.stop());
            context?.close().catch(() => {});
            setStatus("UNKNOWN");
        };
    }, [enabled, minSpeechMs, cooldownSeconds]);

    return { status };
}

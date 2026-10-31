"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { answerFingerprint, answerRetryDelay, changedQuestionIds, classifyExamError, toSavePayload } from "@/lib/proctoring/examLogic";
import { saveProctoredAnswer } from "@/services/proctoring.service";

const FLUSH_POLL_MS = 200;

/**
 * Saves answers to the server as they change, so a refresh or another device gets them back.
 * The ideas are ProctorGuard's: every change gets a revision and the server ignores older ones,
 * failures retry with backoff and again on reconnecting, and the status shown is honest.
 * It watches the LMS attempt tracker's state rather than holding its own copy of the answers.
 */
export default function useAnswerSync({ attemptId, questionStates, serverAnswers, enabled, onEnded, onSuperseded, onRecheckRequired }) {
    const [unsavedIds, setUnsavedIds] = useState([]);
    const [retrying, setRetrying] = useState(false);

    const revisions = useRef(Object.fromEntries((serverAnswers || []).map((row) => [row.questionId, row.revision ?? 0])));
    const lastSent = useRef({});
    const inFlight = useRef({});
    const timers = useRef({});
    const failures = useRef({});
    const latest = useRef(questionStates);
    latest.current = questionStates;
    const closed = useRef(false);
    const sendRef = useRef(() => {});
    const handlers = useRef({});
    handlers.current = { onEnded, onSuperseded, onRecheckRequired };

    const refreshUnsaved = useCallback(() => {
        setUnsavedIds(changedQuestionIds(latest.current, lastSent.current));
    }, []);

    const send = useCallback(
        async (questionId) => {
            if (closed.current || inFlight.current[questionId]) return;
            const record = latest.current[questionId];
            if (!record) return;
            const fingerprint = answerFingerprint(record);
            if (fingerprint === lastSent.current[questionId]) return;

            inFlight.current[questionId] = true;
            const revision = (revisions.current[questionId] ?? 0) + 1;
            revisions.current[questionId] = revision;
            try {
                await saveProctoredAnswer(attemptId, questionId, toSavePayload(record, revision));
                lastSent.current[questionId] = fingerprint;
                failures.current[questionId] = 0;
                setRetrying(Object.values(failures.current).some(Boolean));
            } catch (error) {
                const kind = classifyExamError(error);
                if (kind === "ENDED") {
                    closed.current = true;
                    handlers.current.onEnded?.();
                } else if (kind === "SUPERSEDED") {
                    closed.current = true;
                    handlers.current.onSuperseded?.();
                } else if (kind === "RECHECK") {
                    handlers.current.onRecheckRequired?.();
                } else if (kind === "RETRY") {
                    const attempts = failures.current[questionId] ?? 0;
                    failures.current[questionId] = attempts + 1;
                    setRetrying(true);
                    clearTimeout(timers.current[questionId]);
                    timers.current[questionId] = setTimeout(() => sendRef.current(questionId), answerRetryDelay(attempts));
                }
            } finally {
                inFlight.current[questionId] = false;
                refreshUnsaved();
                // A newer change arrived while this one was on its way.
                if (!closed.current && latest.current[questionId] && answerFingerprint(latest.current[questionId]) !== lastSent.current[questionId] && !failures.current[questionId]) {
                    sendRef.current(questionId);
                }
            }
        },
        [attemptId, refreshUnsaved]
    );
    sendRef.current = send;

    // What the server already has does not need sending again after a refresh.
    const seeded = useRef(false);
    useEffect(() => {
        if (seeded.current || !enabled || !questionStates || Object.keys(questionStates).length === 0) return;
        seeded.current = true;
        for (const row of serverAnswers || []) {
            const record = questionStates[row.questionId];
            if (record && JSON.stringify(record.answer ?? null) === JSON.stringify(row.answer ?? null)) lastSent.current[row.questionId] = answerFingerprint(record);
        }
    }, [enabled, questionStates, serverAnswers]);

    useEffect(() => {
        if (!enabled || closed.current || !seeded.current) return;
        changedQuestionIds(questionStates, lastSent.current).forEach((questionId) => {
            if (!failures.current[questionId]) sendRef.current(questionId);
        });
        refreshUnsaved();
    }, [enabled, questionStates, refreshUnsaved]);

    useEffect(() => {
        const resend = () => changedQuestionIds(latest.current, lastSent.current).forEach((questionId) => sendRef.current(questionId));
        window.addEventListener("online", resend);
        const pending = timers.current;
        return () => {
            window.removeEventListener("online", resend);
            Object.values(pending).forEach(clearTimeout);
        };
    }, []);

    /** Tries to deliver everything before submitting. Resolves with how many remain unsaved. */
    const flush = useCallback(async (timeoutMs = 8000) => {
        const deadline = Date.now() + timeoutMs;
        for (;;) {
            const remaining = changedQuestionIds(latest.current, lastSent.current);
            if (remaining.length === 0 || closed.current || Date.now() >= deadline) return remaining.length;
            remaining.forEach((questionId) => {
                clearTimeout(timers.current[questionId]);
                sendRef.current(questionId);
            });
            await new Promise((resolve) => setTimeout(resolve, FLUSH_POLL_MS));
        }
    }, []);

    return { unsavedCount: unsavedIds.length, retrying, flush };
}

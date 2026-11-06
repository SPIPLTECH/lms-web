"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Clock } from "lucide-react";

// One sessionStorage key per quiz attempt, so a refresh resumes the same
// countdown instead of restarting it, while a new attempt (attemptsUsed
// incremented server-side) starts a fresh one. sessionStorage (not
// localStorage) so it doesn't outlive the tab/browser session, and it's
// already wiped on logout (see AuthContext's sessionStorage.clear()).
export function getQuizTimerStorageKey(quizId, attemptsUsed = 0) {
    if (!quizId) return undefined;
    return `quiz-timer:${quizId}:${attemptsUsed + 1}`;
}

function readOrCreateDeadline(storageKey, durationMinutes) {
    const freshDeadline = () => Date.now() + durationMinutes * 60 * 1000;

    if (typeof window === "undefined" || !storageKey) {
        return freshDeadline();
    }

    const stored = Number(window.sessionStorage.getItem(storageKey));
    if (Number.isFinite(stored) && stored > 0) {
        return stored;
    }

    const deadline = freshDeadline();
    window.sessionStorage.setItem(storageKey, String(deadline));
    return deadline;
}

export default function QuizTimer({
                                      duration = 15,
                                      storageKey,
                                      onTimeUp,
                                      // A deadline decided elsewhere (a proctored exam's, from the
                                      // server), in this browser's clock. Nothing is stored for it.
                                      fixedDeadline = null,
                                  }) {
    const effectiveDuration = useMemo(() => {
        const num = Number(duration);
        return !isNaN(num) && num > 0 ? num : 15;
    }, [duration]);

    // The countdown is driven off a fixed deadline timestamp (persisted above)
    // rather than a decrementing counter, so it reflects real elapsed time
    // even after a refresh or a throttled background tab.
    const [deadline, setDeadline] = useState(() =>
        fixedDeadline ?? readOrCreateDeadline(storageKey, effectiveDuration)
    );

    useEffect(() => {
        setDeadline(fixedDeadline ?? readOrCreateDeadline(storageKey, effectiveDuration));
    }, [storageKey, effectiveDuration, fixedDeadline]);

    const [timeLeft, setTimeLeft] = useState(() =>
        Math.max(0, Math.round((deadline - Date.now()) / 1000))
    );

    // Kept current via a ref (not an effect dependency below) so a parent
    // re-render that passes a new onTimeUp identity can't restart the
    // interval or re-arm the fired guard while time is already up.
    const onTimeUpRef = useRef(onTimeUp);
    useEffect(() => {
        onTimeUpRef.current = onTimeUp;
    }, [onTimeUp]);

    useEffect(() => {
        let firedTimeUp = false;

        const evaluate = () => {
            const remaining = Math.max(
                0,
                Math.round((deadline - Date.now()) / 1000)
            );
            setTimeLeft(remaining);

            if (remaining <= 0 && !firedTimeUp) {
                firedTimeUp = true;
                onTimeUpRef.current?.();
            }
        };

        evaluate();
        const timer = setInterval(evaluate, 1000);
        return () => clearInterval(timer);
    }, [deadline]);

    const formattedTime = useMemo(() => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;

        return `${String(minutes).padStart(
            2,
            "0"
        )}:${String(seconds).padStart(2, "0")}`;
    }, [timeLeft]);

    const isWarning = timeLeft <= 300;
    const isCritical = timeLeft <= 60;

    return (
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
            <div
                className={`flex h-6 w-6 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl ${
                    isCritical
                        ? "bg-red-500/10"
                        : isWarning
                            ? "bg-amber-500/10"
                            : "bg-primary/10"
                }`}
            >
                <Clock
                    className={`h-3.5 w-3.5 sm:h-5 sm:w-5 ${
                        isCritical
                            ? "text-red-400"
                            : isWarning
                                ? "text-amber-400"
                                : "text-primary"
                    }`}
                />
            </div>

            <div className="min-w-0">
                <p className="hidden sm:block text-xs text-muted-foreground">
                    Time Remaining
                </p>

                <p
                    className={`text-xs sm:text-2xl font-bold leading-tight tabular-nums ${
                        isCritical
                            ? "text-red-400"
                            : isWarning
                                ? "text-amber-400"
                                : "text-primary"
                    }`}
                >
                    {formattedTime}
                </p>
            </div>
        </div>
    );
}
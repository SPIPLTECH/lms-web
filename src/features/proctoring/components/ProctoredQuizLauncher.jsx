"use client";

import { useEffect, useId, useState } from "react";
import { Camera, CameraOff, Clock, ListChecks, MonitorSmartphone, ShieldCheck } from "lucide-react";

import Loader from "@/components/common/Loader";
import Button from "@/components/ui/Button";
import { useConfirm } from "@/context/ConfirmContext";
import { useOptOutOfProctoring, useProctoredQuizStatus } from "@/hooks/queries/student/useProctoredExam";
import { openProctoredExam } from "@/lib/proctoring/examAddress";
import { refusalMessage } from "@/lib/proctoring/examLogic";

function Fact({ icon: Icon, children }) {
    return (
        <li className="flex items-start gap-2 text-sm text-muted-foreground">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span>{children}</span>
        </li>
    );
}

// The On/Off switch for the proctoring choice, in the order shown.
const PROCTORING_CHOICES = [
    { withProctoring: true, label: "On", icon: Camera },
    { withProctoring: false, label: "Off", icon: CameraOff },
];

/**
 * What a student sees wherever a proctored quiz would otherwise open. The exam has its own page,
 * entered with a full page load, because only that page may use the camera and microphone and the
 * browser keeps the permissions of the page it first loaded.
 */
export default function ProctoredQuizLauncher({ quiz, onBack, resultReturnTo }) {
    const { data: status, isLoading, isError, refetch } = useProctoredQuizStatus(quiz.id);
    const optOut = useOptOutOfProctoring(quiz.id);
    const confirm = useConfirm();
    // The switch starts on proctoring, the way the instructor set the quiz up. Nothing is saved
    // until the main button is pressed.
    const [withProctoring, setWithProctoring] = useState(true);
    const choiceLabelId = useId();

    useEffect(() => {
        const onPageShow = (event) => {
            if (event.persisted) refetch();
        };
        window.addEventListener("pageshow", onPageShow);
        return () => window.removeEventListener("pageshow", onPageShow);
    }, [refetch]);

    const open = () => openProctoredExam({ quizId: quiz.id, returnTo: resultReturnTo });

    // Declining is final for this quiz, so it is confirmed first. On success the quiz reloads
    // as an ordinary quiz and this card gives way to it.
    const declineProctoring = async () => {
        const confirmed = await confirm({
            title: "Take this quiz without proctoring?",
            message: "You will take the same quiz without your camera or exam monitoring. You cannot switch proctoring back on for this quiz later.",
            confirmText: "Continue without proctoring",
            cancelText: "Cancel",
        });
        if (confirmed) optOut.mutate();
    };

    if (isLoading) return <Loader />;

    const inProgress = Boolean(status?.attempt);
    const refusal = status && !inProgress && !status.canStart ? refusalMessage(status.reason) : null;
    const canOpen = inProgress || status?.canStart || Boolean(status?.lastAttempt);
    // Asked before each attempt, until the exam itself starts: with proctoring, or the same quiz without it.
    const askChoice = Boolean(status?.canOptOut);
    const optOutError = optOut.isError ? optOut.error?.response?.data?.message || "Your choice could not be saved. Please try again." : null;

    // Arrow keys move between On and Off, as in any radio group.
    const onChoiceKeyDown = (event) => {
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
        event.preventDefault();
        const next = !withProctoring;
        setWithProctoring(next);
        event.currentTarget.parentElement.querySelector(`[data-with-proctoring="${next}"]`)?.focus();
    };

    return (
        // data-proctored-launcher: the learning player centres its quiz wrapper on this card.
        <div data-proctored-launcher className="mx-auto w-full max-w-xl rounded-2xl border border-border bg-card p-6 sm:p-8">
            <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ShieldCheck className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold text-foreground">{quiz.title}</h2>
                    <p className="text-xs font-medium text-muted-foreground">Proctored exam</p>
                </div>
            </div>

            <ul className="mt-4 space-y-2">
                {status?.durationMinutes ? <Fact icon={Clock}>{status.durationMinutes} minutes, starting when you begin. Your time keeps running if you leave.</Fact> : null}
                {status?.questionCount ? <Fact icon={ListChecks}>{status.questionCount} {status.questionCount === 1 ? "question" : "questions"}{status.maxAttempts ? ` · ${status.attemptsRemaining} of ${status.maxAttempts} attempts left` : ""}</Fact> : null}
                <Fact icon={Camera}>Your camera stays on throughout. You will take an identity photo first.</Fact>
                <Fact icon={MonitorSmartphone}>Use a laptop or desktop computer with a current version of Chrome or Edge.</Fact>
            </ul>

            {isError && (
                <p role="alert" className="mt-4 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
                    This exam could not be loaded. Please try again.
                </p>
            )}
            {status && !status.deviceAllowed && (
                <p role="alert" className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                    This device or browser cannot be used for this exam. Open it on a laptop or desktop computer with a current version of Chrome or Edge.
                </p>
            )}
            {refusal && (
                <p role="alert" className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                    {refusal}
                </p>
            )}

            {/* The choice is a setting (On/Off) above the card's one main button, which
                follows the switch: open the proctored exam, or opt out (confirmed first). */}
            {askChoice && (
                <div className="mt-6 rounded-xl border border-border bg-background/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p id={choiceLabelId} className="text-sm font-semibold text-foreground">
                            Proctoring
                        </p>
                        <div role="radiogroup" aria-labelledby={choiceLabelId} className="inline-flex rounded-lg border border-border bg-background p-0.5">
                            {PROCTORING_CHOICES.map(({ withProctoring: value, label, icon: Icon }) => {
                                const active = withProctoring === value;
                                return (
                                    <button
                                        key={label}
                                        type="button"
                                        role="radio"
                                        aria-checked={active}
                                        tabIndex={active ? 0 : -1}
                                        data-with-proctoring={value}
                                        disabled={optOut.isPending}
                                        onClick={() => setWithProctoring(value)}
                                        onKeyDown={onChoiceKeyDown}
                                        className={`inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-md px-3.5 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60 ${
                                            active ? "bg-card text-foreground shadow-[0_0_0_1px_var(--border)]" : "text-muted-foreground hover:text-foreground"
                                        }`}
                                    >
                                        <Icon className="h-3.5 w-3.5" aria-hidden />
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground" aria-live="polite">
                        {withProctoring
                            ? "Your camera monitors the exam."
                            : "You take the same quiz without your camera. You cannot switch proctoring back on for this quiz later."}
                    </p>
                    {optOutError && (
                        <p role="alert" className="mt-3 text-sm text-rose-700 dark:text-rose-300">
                            {optOutError}
                        </p>
                    )}
                </div>
            )}

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                {askChoice &&
                    (withProctoring ? (
                        <Button type="button" onClick={open} disabled={!(inProgress || status?.canStart) || optOut.isPending} className="flex-1">
                            Open proctored exam
                        </Button>
                    ) : (
                        <Button type="button" onClick={declineProctoring} disabled={optOut.isPending} className="flex-1">
                            {optOut.isPending ? "Saving…" : "Continue without proctoring"}
                        </Button>
                    ))}
                {canOpen && !askChoice && (
                    <Button type="button" onClick={open} className="flex-1">
                        {inProgress ? "Return to your exam" : status?.canStart ? "Open exam" : "View outcome"}
                    </Button>
                )}
                {onBack && (
                    <Button type="button" variant="outline" onClick={onBack} className="flex-1">
                        Go back
                    </Button>
                )}
            </div>
        </div>
    );
}

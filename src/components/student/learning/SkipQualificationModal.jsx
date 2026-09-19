"use client";

import { BookOpen, ClipboardCheck, Clock, Repeat2, Target } from "lucide-react";

import Button from "@/components/ui/Button";

/**
 * The confirmation a student sees before a qualifying test — the step that
 * makes "Skip" an informed choice rather than an escape hatch.
 *
 * It never skips anything itself. It explains what the test is, what passing
 * takes, and how many attempts they get, then hands off to the existing quiz
 * player. The skip is earned by passing; nothing here unlocks anything.
 */
export default function SkipQualificationModal({
    isOpen,
    onClose,
    onTakeTest,
    target,
    quiz,
}) {
    if (!isOpen || !quiz || !target) return null;

    const targetLabel = target.kind === "TOPIC" ? "topic" : "lesson";
    const unlimited = !(Number(quiz.attempts) > 0);
    const attemptsLabel = unlimited
        ? "Unlimited attempts"
        : `${quiz.attempts} attempt${quiz.attempts === 1 ? "" : "s"}`;

    const facts = [
        { icon: Target, label: "Pass mark", value: `${quiz.passingScore}%` },
        {
            icon: ClipboardCheck,
            label: "Questions",
            value: `${quiz.questionCount} question${quiz.questionCount === 1 ? "" : "s"}`,
        },
        { icon: Repeat2, label: "Attempts", value: attemptsLabel },
        ...(Number(quiz.timeLimit) > 0
            ? [{ icon: Clock, label: "Time limit", value: `${quiz.timeLimit} min` }]
            : []),
    ];

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-3 sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="skip-qualification-title"
        >
            <div className="my-auto flex max-h-[90dvh] w-full max-w-lg flex-col rounded-xl border border-border bg-background shadow-2xl sm:rounded-2xl">
                <div className="flex items-start gap-3 border-b border-border px-4 py-3.5 sm:px-6 sm:py-5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:h-10 sm:w-10">
                        <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
                    </div>
                    <div className="min-w-0">
                        <h2
                            id="skip-qualification-title"
                            className="text-base font-bold text-foreground sm:text-xl"
                        >
                            Want to skip this content?
                        </h2>
                        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                            Take a short qualifying test to check whether you already understand this{" "}
                            {targetLabel}.
                        </p>
                    </div>
                </div>

                <div className="min-h-0 space-y-3.5 overflow-y-auto px-4 py-4 sm:space-y-5 sm:px-6 sm:py-6">
                    <div className="rounded-lg border border-border bg-muted/40 p-3 sm:rounded-xl sm:p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-[11px]">
                            You would skip
                        </p>
                        <p className="mt-1 break-words text-sm font-semibold text-foreground sm:text-base">
                            {target.title}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        {facts.map(({ icon: Icon, label, value }) => (
                            <div key={label} className="rounded-lg bg-muted/50 p-2.5 sm:rounded-xl sm:p-3">
                                <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-[11px]">
                                    <Icon size={12} className="shrink-0 text-primary" aria-hidden />
                                    <span className="truncate">{label}</span>
                                </p>
                                <p className="mt-1 text-[13px] font-semibold tabular-nums text-foreground sm:text-sm">
                                    {value}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 sm:rounded-xl sm:p-4">
                        <p className="text-xs font-semibold text-sky-700 dark:text-sky-300 sm:text-sm">
                            What happens next
                        </p>
                        <ul className="mt-1.5 space-y-1 text-xs text-foreground sm:mt-2 sm:text-sm">
                            <li>
                                Score {quiz.passingScore}% or higher and this {targetLabel} is marked as
                                skipped, and the next one opens.
                            </li>
                            <li>
                                Score below that and it stays part of your learning path — you&apos;ll see
                                which areas to review.
                            </li>
                            <li>
                                Either way, this {targetLabel} stays in your course and you can open it
                                whenever you like.
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="flex flex-col-reverse gap-2.5 border-t border-border px-4 py-3.5 sm:flex-row sm:justify-end sm:gap-3 sm:px-6 sm:py-5">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="h-10 min-h-0 w-full px-4 text-xs sm:w-auto sm:text-sm"
                    >
                        Continue Learning
                    </Button>
                    <Button
                        type="button"
                        onClick={onTakeTest}
                        className="h-10 min-h-0 w-full px-4 text-xs font-semibold sm:w-auto sm:text-sm"
                    >
                        Take Qualifying Test
                    </Button>
                </div>
            </div>
        </div>
    );
}

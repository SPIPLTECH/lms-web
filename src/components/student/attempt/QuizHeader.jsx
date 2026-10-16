"use client";

import Link from "next/link";
import { ArrowLeft, ClipboardCheck } from "lucide-react";

import QuizTimer, { getQuizTimerStorageKey } from "@/components/student/attempt/QuizTimer";

export default function QuizHeader({
                                       quiz,
                                       onBack,
                                       onTimeUp,
                                       answeredCount = 0,
                                   }) {
    if (!quiz) return null;

    const questionCount = quiz.questions?.length ?? 0;
    const unansweredCount = Math.max(0, questionCount - answeredCount);

    // No fallback duration. A quiz with no time limit is untimed — inventing
    // one here would start a countdown that force-submits the attempt.
    const timeLimit = Number(quiz.timeLimit) > 0 ? Number(quiz.timeLimit) : null;

    // A Qualifying Test is neither practice nor the formal assessment — it is
    // what lets the student skip this content — so the old two-way branch
    // announced it to them as a "Final Quiz", which is the one thing it is not.
    const QUIZ_TYPE_LABELS = {
        SELF_TEST: "Self-Test",
        QUALIFYING: "Qualifying Test",
        FINAL: "Final Quiz",
    };
    const quizTypeLabel = QUIZ_TYPE_LABELS[quiz.quizTag] || QUIZ_TYPE_LABELS.FINAL;

    return (
        <div className="flex min-w-0 flex-row items-center justify-between sm:justify-start gap-2 sm:gap-3 rounded-xl border border-border bg-background/80 px-2.5 sm:px-4 py-2 sm:py-2.5">
            {/* Identity row */}
            <div className="flex min-w-0 flex-1 items-center gap-2">
                {onBack ? (
                    <button
                        type="button"
                        onClick={onBack}
                        title="Back to Lesson"
                        className="max-xl:hidden flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-primary cursor-pointer bg-transparent border-0 outline-none"
                    >
                        <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </button>
                ) : (
                    <Link
                        href="/student/quizzes"
                        title="Back to Quizzes"
                        className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-primary"
                    >
                        <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Link>
                )}

                <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ClipboardCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>

                <div className="min-w-0 flex-1">
                    <h1 className="truncate text-xs sm:text-base font-bold text-foreground">
                        {quiz.title}
                    </h1>

                    <p className="text-[10px] sm:text-[11px] text-muted-foreground">
                        {quizTypeLabel} &bull; {questionCount}{" "}
                        {questionCount === 1 ? "Question" : "Questions"}
                        {timeLimit === null && <> &bull; No timer</>}
                    </p>
                </div>
            </div>

            <div className="hidden shrink-0 items-center gap-3 border-l border-border pl-3 sm:flex">
                <div className="text-center">
                    <p className="text-[11px] text-muted-foreground">Answered</p>
                    <p className="text-sm font-bold text-emerald-400">{answeredCount}</p>
                </div>

                <div className="text-center">
                    <p className="text-[11px] text-muted-foreground">Unanswered</p>
                    <p className="text-sm font-bold text-amber-400">{unansweredCount}</p>
                </div>
            </div>

            {timeLimit !== null && (
                <div className="shrink-0 sm:border-l sm:border-border sm:pl-3">
                    <QuizTimer
                        duration={timeLimit}
                        storageKey={getQuizTimerStorageKey(
                            quiz.id,
                            quiz.attemptStatus?.attemptsUsed ?? 0
                        )}
                        onTimeUp={onTimeUp}
                    />
                </div>
            )}
        </div>
    );
}

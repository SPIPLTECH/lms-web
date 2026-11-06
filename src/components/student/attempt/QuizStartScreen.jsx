"use client";

import { ArrowRight, ClipboardCheck } from "lucide-react";

import Button from "@/components/ui/Button";

function Detail({ label, value }) {
    return (
        <div className="min-w-0 rounded-xl border border-border bg-background/60 px-3 py-2.5">
            <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 break-words text-sm font-bold text-foreground">{value}</dd>
        </div>
    );
}

/**
 * What a student sees before a Final Quiz begins: what it is, how long it
 * takes and what it is worth. The attempt, and its timer, start only from the
 * Start Quiz button (see QuizExperience).
 */
export default function QuizStartScreen({ quiz, onStart, onBack }) {
    const questions = quiz.questions || [];
    const totalMarks = questions.reduce((sum, question) => sum + (Number(question.marks) || 1), 0);
    const timeLimit = Number(quiz.timeLimit) > 0 ? Number(quiz.timeLimit) : null;
    const allowance = quiz.attemptStatus;
    const attemptNumber = (allowance?.attemptsUsed ?? 0) + 1;

    return (
        <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-5 sm:p-8">
            <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-primary">Final Quiz</p>
                    <h1 className="mt-0.5 break-words text-lg font-bold text-foreground sm:text-xl">{quiz.title}</h1>
                </div>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {quiz.place?.title && (
                    <div className="col-span-2 sm:col-span-3">
                        <Detail label={quiz.place.level} value={quiz.place.title} />
                    </div>
                )}
                <Detail label="Time" value={timeLimit ? `${timeLimit} ${timeLimit === 1 ? "minute" : "minutes"}` : "No time limit"} />
                <Detail label="Questions" value={questions.length} />
                <Detail label="Total marks" value={totalMarks} />
                {Number(quiz.passingScore) > 0 && <Detail label="Pass mark" value={`${quiz.passingScore}%`} />}
                {allowance && (
                    <Detail
                        label="Attempt"
                        value={allowance.unlimitedAttempts ? attemptNumber : `${attemptNumber} of ${allowance.maxAttempts}`}
                    />
                )}
            </dl>

            <p className="mt-4 text-sm text-muted-foreground">
                {timeLimit
                    ? "The timer starts when you press Start Quiz, and your answers are submitted automatically when time runs out."
                    : "Press Start Quiz when you are ready."}
            </p>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                {onBack && (
                    <Button type="button" variant="outline" onClick={onBack}>
                        Go back
                    </Button>
                )}
                <Button
                    type="button"
                    onClick={onStart}
                    disabled={questions.length === 0}
                    className="inline-flex items-center justify-center gap-2"
                >
                    Start Quiz <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
            </div>
        </div>
    );
}

"use client";

import Button from "@/components/ui/Button";

export default function QuizSubmitModal({
    isOpen,
    onClose,
    onConfirm,
    totalQuestions = 0,
    answeredQuestions = 0,
    skippedQuestions = 0,
    isSubmitting = false,
    errorMessage = null,
}) {
    if (!isOpen) return null;

    const unansweredQuestions = Math.max(0, totalQuestions - answeredQuestions);
    const hasUnanswered = unansweredQuestions > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4 overflow-y-auto">
            <div className="w-full max-w-lg rounded-xl sm:rounded-2xl border border-border bg-background shadow-2xl my-auto max-h-[90dvh] flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-border px-4 py-3.5 sm:px-6 sm:py-5 shrink-0">
                    <div>
                        <h2 className="text-lg sm:text-2xl font-bold text-foreground">
                            {hasUnanswered ? "Incomplete Quiz Attempt" : "Submit Quiz"}
                        </h2>

                        <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-muted-foreground">
                            {hasUnanswered
                                ? "Please answer all questions before submitting your attempt."
                                : "Please review your quiz before final submission."}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="ml-2 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        aria-label="Close modal"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="space-y-3.5 sm:space-y-5 px-4 py-4 sm:px-6 sm:py-6 overflow-y-auto min-h-0">
                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                        <div className="rounded-lg sm:rounded-xl bg-muted p-2.5 sm:p-4 text-center">
                            <p className="text-[11px] sm:text-sm text-muted-foreground font-medium">
                                Questions
                            </p>

                            <p className="mt-1 sm:mt-2 text-xl sm:text-2xl font-bold text-foreground">
                                {totalQuestions}
                            </p>
                        </div>

                        <div className="rounded-lg sm:rounded-xl bg-green-500/10 p-2.5 sm:p-4 text-center">
                            <p className="text-[11px] sm:text-sm text-muted-foreground font-medium">
                                Answered
                            </p>

                            <p className="mt-1 sm:mt-2 text-xl sm:text-2xl font-bold text-green-400">
                                {answeredQuestions}
                            </p>
                        </div>

                        <div className="rounded-lg sm:rounded-xl bg-red-500/10 p-2.5 sm:p-4 text-center">
                            <p className="text-[11px] sm:text-sm text-muted-foreground font-medium">
                                Remaining
                            </p>

                            <p className="mt-1 sm:mt-2 text-xl sm:text-2xl font-bold text-red-400">
                                {unansweredQuestions}
                            </p>
                        </div>
                    </div>

                    {errorMessage ? (
                        <div className="rounded-lg sm:rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 sm:p-4">
                            <p className="text-xs sm:text-base font-semibold text-rose-400 flex items-center gap-1.5">
                                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                Submission Error
                            </p>

                            <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-foreground">
                                {errorMessage}
                            </p>
                        </div>
                    ) : hasUnanswered ? (
                        <div className="rounded-lg sm:rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 sm:p-4">
                            <p className="text-xs sm:text-base font-semibold text-rose-400">
                                Action Required
                            </p>

                            <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-foreground">
                                You still have{" "}
                                <strong>
                                    {unansweredQuestions}
                                </strong>{" "}
                                unanswered{" "}
                                {unansweredQuestions === 1
                                    ? "question"
                                    : "questions"}
                                . Please answer all questions before submitting.
                            </p>

                            {/* Only questions still outstanding — one the student
                                skipped and later went back and answered is not
                                something they need reminding about. */}
                            {skippedQuestions > 0 && (
                                <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-muted-foreground">
                                    <strong className="text-foreground">{skippedQuestions}</strong> of
                                    those {skippedQuestions === 1 ? "was" : "were"} skipped — marked
                                    in red in the question strip.
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="rounded-lg sm:rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 sm:p-4">
                            <p className="text-xs sm:text-base font-semibold text-emerald-400">
                                All Questions Answered
                            </p>

                            <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-foreground">
                                Once you submit the quiz, you won't be able to modify your answers.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2.5 sm:gap-3 border-t border-border px-4 py-3.5 sm:px-6 sm:py-5 shrink-0">
                    {hasUnanswered ? (
                        <Button
                            type="button"
                            onClick={onClose}
                            className="w-full sm:w-auto min-h-0 h-10 text-xs sm:text-sm px-4 bg-primary hover:bg-orange-600 text-foreground font-semibold"
                        >
                            Back to Questions
                        </Button>
                    ) : (
                        <>
                            <Button
                                type="button"
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="flex-1 sm:flex-none min-h-0 h-10 text-xs sm:text-sm px-4 bg-slate-700 hover:bg-muted"
                            >
                                Cancel
                            </Button>

                            <Button
                                type="button"
                                onClick={onConfirm}
                                disabled={isSubmitting}
                                className={`flex-1 sm:flex-none min-h-0 h-10 text-xs sm:text-sm px-4 font-semibold ${
                                    errorMessage
                                        ? "bg-rose-600 hover:bg-rose-700 text-white"
                                        : "bg-green-600 hover:bg-green-700"
                                }`}
                            >
                                {isSubmitting
                                    ? "Submitting..."
                                    : errorMessage
                                    ? "Retry Submission"
                                    : "Submit Quiz"}
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
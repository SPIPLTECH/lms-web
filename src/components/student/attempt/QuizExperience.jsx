"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

import Loader from "@/components/common/Loader";
import Button from "@/components/ui/Button";
import QuizHeader from "@/components/student/attempt/QuizHeader";
import { getQuizTimerStorageKey } from "@/components/student/attempt/QuizTimer";
import QuestionCard from "@/components/student/attempt/QuestionCard";
import QuizNavigation from "@/components/student/attempt/QuizNavigation";
import QuizSubmitModal from "@/components/student/attempt/QuizSubmitModal";
import QuizResultSummary from "@/components/student/attempt/QuizResultSummary";
import useQuiz from "@/hooks/queries/student/useQuiz";
import useSubmitQuiz from "@/hooks/queries/student/useSubmitQuiz";
import useQuizResult from "@/hooks/queries/student/useQuizResult";
import useTrackCourseAccess from "@/hooks/queries/student/useTrackCourseAccess";
import useQuizAttemptTracker from "@/hooks/useQuizAttemptTracker";
import { checkAnswerCorrectness } from "@/lib/quizAnswers";
import { allQuestionsChecked } from "@/lib/quizAttemptState";
import { resolveQuestionType } from "@/lib/questionType";

/**
 * Under a Self-Test's navigation: how many answers are checked, then — once
 * every one is and the attempt has saved itself — how it went and the way
 * on. There is no Submit and no result page for practice; this is its end.
 */
function PracticeStatus({
    checkedCount,
    totalQuestions,
    allChecked,
    saving,
    saved,
    saveError,
    onRetrySave,
    rightCount,
    markedCount,
    onNextContent,
    onBack,
}) {
    if (!allChecked) {
        return (
            <p className="px-1 text-xs text-muted-foreground sm:text-sm">
                {checkedCount} of {totalQuestions} checked — check every question to finish this practice.
            </p>
        );
    }

    if (saveError && !saving) {
        return (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 sm:p-4">
                <p className="text-sm text-rose-700 dark:text-rose-300">
                    Your practice couldn&apos;t be saved. Check your connection and try again.
                </p>
                <Button type="button" onClick={onRetrySave} className="min-h-[44px]">
                    Save again
                </Button>
            </div>
        );
    }

    if (!saved) {
        return (
            <p className="flex items-center gap-2 px-1 text-xs text-muted-foreground sm:text-sm" aria-live="polite">
                <Loader2 size={14} className="animate-spin" aria-hidden />
                Saving your practice…
            </p>
        );
    }

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 sm:p-4" aria-live="polite">
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 size={18} className="shrink-0" aria-hidden />
                <span>
                    Practice complete
                    {markedCount > 0 && ` — ${rightCount} of ${markedCount} correct`}.
                </span>
            </p>
            {onNextContent ? (
                <Button type="button" onClick={onNextContent} className="inline-flex min-h-[44px] items-center gap-1.5">
                    Next <ArrowRight size={16} aria-hidden />
                </Button>
            ) : onBack ? (
                <Button type="button" variant="outline" onClick={onBack} className="min-h-[44px]">
                    Done
                </Button>
            ) : null}
        </div>
    );
}

/**
 * The actual quiz-taking experience (timer, questions, navigation, submit) —
 * shared by the standalone /student/attempt/[quizId] route and anywhere else
 * that launches a quiz (e.g. the Learning Page's modal/full-screen presenter).
 * Presentation (page vs modal vs full-screen) is entirely the caller's job;
 * this component only knows about the quiz itself.
 *
 * Every launch point comes through here, so this is also where a student who
 * has used all their attempts is stopped — before answering, rather than
 * after the server refuses the submission.
 */
// `onSubmitted` fires once an attempt has been accepted by the server. It is
// how a caller that needs to react to the submission itself — the learning
// page, which swaps a qualifying test for its pass/fail outcome — finds out,
// without this component knowing anything about qualification.
// `autoReattempt` skips the "you have already completed this quiz" landing
// card and opens a fresh attempt straight away, for a caller that has already
// asked the student whether they want another go — the qualifying-test retake
// does exactly that, and a second confirmation there would just be the same
// question twice.
//
// It skips the CONFIRMATION only, never the allowance — see showCompletedCard.
export default function QuizExperience({ quizId, onBack, resultReturnTo, onNextContent, speechLanguage, onSubmitted, autoReattempt = false }) {
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [submitError, setSubmitError] = useState("");
    // Dismisses the "already completed" landing card below in favor of the
    // normal quiz-taking view, for a student who still has an attempt left.
    const [reattempting, setReattempting] = useState(autoReattempt);
    // When the questions were first shown — the start of this attempt's
    // time taken.
    const startedAtRef = useRef(null);

    const {
        data,
        isLoading,
        isError,
    } = useQuiz(quizId);

    const quiz = data?.data || data;

    const trackAccessMutation = useTrackCourseAccess();
    useEffect(() => {
        if (quiz?.courseId) {
            trackAccessMutation.mutate(quiz.courseId);
        }
    }, [quiz?.courseId]);

    const questions = useMemo(
        () => quiz?.questions || [],
        [quiz]
    );

    const [showSubmitModal, setShowSubmitModal] =
        useState(false);

    // A Self-Test — the server's call (revealAnswers), the one quiz whose
    // answer key the student is sent. It is practice: each answer is checked
    // as the student goes, there is no Submit (the attempt saves itself once
    // every question is checked), no "already completed" card and no result
    // page — coming back to it simply starts it again.
    const isPractice = quiz?.revealAnswers === true;

    // Present for students only (see GET /quizzes/:id).
    const allowance = quiz?.attemptStatus;
    const hasPriorAttempt = Boolean(allowance && allowance.attemptsUsed > 0);

    // The server's own answer, never recomputed here: attemptStatus.canAttempt
    // is buildAttemptAllowance(effectiveMaxAttempts(quiz), used). It defaults
    // to true only while the quiz is still loading, so a slow response never
    // flashes "no attempts left" at a student who has some.
    const canTakeAnother = allowance ? allowance.canAttempt === true : true;

    // Show the "already completed" card when the student hasn't chosen to
    // retake, OR when they have no attempt left to spend. autoReattempt sets
    // `reattempting` true up front and so used to satisfy this on its own —
    // which walked a student with a spent allowance into a quiz the server
    // would always refuse, under a header reading "Attempt 2 of 1". The
    // allowance is now part of the gate and autoReattempt cannot override it.
    const showCompletedCard = !isPractice && hasPriorAttempt && (!reattempting || !canTakeAnother);

    // Whether an attempt is actually being taken right now, as opposed to the
    // "already completed" card or the post-submit summary being shown over the
    // quiz. The tracker tracks and persists nothing outside that window — see
    // useQuizAttemptTracker.
    const isAttemptActive = Boolean(quiz) && !isSubmitted && !showCompletedCard;

    // Question-level state for this attempt: answer, status, visited/skipped/
    // hint history per question, plus which question is open and the
    // per-attempt sessionStorage persistence behind a refresh. Everything the
    // UI below reads about the attempt's progress comes from here.
    const {
        questionStates,
        currentQuestionIndex,
        currentQuestion,
        currentAnswer,
        currentAnswerChecked,
        summary,
        goToQuestion,
        goToNext,
        goToPrevious,
        answerCurrentQuestion,
        viewCurrentHint,
        checkCurrentAnswer,
        skipCurrentQuestion,
        buildSubmitPayload,
        clearStoredProgress,
    } = useQuizAttemptTracker({
        quizId: quiz?.id,
        questions,
        attemptsUsed: quiz?.attemptStatus?.attemptsUsed ?? 0,
        active: isAttemptActive,
        // A refresh keeps a Self-Test's answers; leaving it starts it fresh.
        forgetOnLeave: isPractice,
    });

    const answeredQuestions = summary.answeredCount;

    // Each checked Self-Test question: right (true), wrong (false), or
    // nothing to mark (null — a written answer, compared by the student).
    const checkedResults = useMemo(() => {
        if (!isPractice) return {};
        const results = {};
        for (const q of questions) {
            const record = questionStates[q.id];
            if (!record?.answerChecked) continue;
            const type = resolveQuestionType(q.questionType);
            results[q.id] = type === "SELF_ASSESSMENT" ? null : checkAnswerCorrectness(type, record.answer, q.correctAnswer, q.options);
        }
        return results;
    }, [isPractice, questions, questionStates]);
    const practiceAllChecked = isPractice && allQuestionsChecked(questionStates, questions);
    const practiceMarked = Object.values(checkedResults).filter((v) => v !== null);
    const practiceRight = practiceMarked.filter(Boolean).length;

    useEffect(() => {
        if (quiz && startedAtRef.current === null) {
            startedAtRef.current = Date.now();
        }
    }, [quiz]);

    const submitQuizMutation =
        useSubmitQuiz();

    // Guards against a duplicate submit firing before submitQuizMutation.isPending
    // has re-rendered true — e.g. two near-simultaneous timer expiry calls
    // (React Strict Mode's double effect-invocation in dev) would otherwise
    // both slip past a state-based check in the same tick.
    const submitInFlightRef = useRef(false);

    // Dismissing the confirm modal clears the failure shown inside it, so the
    // next open starts clean rather than re-showing a stale error.
    const handleCloseSubmitModal = () => {
        setSubmitError("");
        submitInFlightRef.current = false;
        setShowSubmitModal(false);
    };

    // Shared by the manual "Submit Quiz" confirm and the timer running out —
    // the timeout path skips the completeness gate below since the attempt
    // has to close regardless of how many questions got answered.
    const performSubmit = () => {
        if (submitInFlightRef.current) return;
        submitInFlightRef.current = true;

        const startedAt = startedAtRef.current;

        // answers (graded server-side) plus the per-question visit/skip/hint
        // activity only the attempt UI can know — see useQuizAttemptTracker.
        const submitPayload = {
            quizId,
            ...buildSubmitPayload(),
            timeTakenSeconds: startedAt
                ? Math.round((Date.now() - startedAt) / 1000)
                : undefined,
        };

        setSubmitError("");

        submitQuizMutation.mutate(
            submitPayload,
            {
                onSuccess: () => {
                    const attemptsUsed = quiz?.attemptStatus?.attemptsUsed ?? 0;
                    const timerKey = getQuizTimerStorageKey(quiz?.id, attemptsUsed);
                    if (timerKey) {
                        window.sessionStorage.removeItem(timerKey);
                    }
                    clearStoredProgress();
                    setShowSubmitModal(false);
                    setIsSubmitted(true);
                    onSubmitted?.();
                },

                onError: (error) => {
                    console.error(
                        "Quiz submission failed",
                        error
                    );
                    // A real failure (network/server) should allow retrying —
                    // only a successful submit keeps this attempt locked.
                    submitInFlightRef.current = false;
                    // The server's message explains a refusal (e.g. no
                    // attempts left); a timeout needs its own wording since
                    // axios reports it with no response at all; anything else
                    // is most likely network.
                    setSubmitError(
                        error?.code === "ECONNABORTED" || error?.message?.includes("timeout")
                            ? "Submission timed out while contacting the server. Please click Retry Submission to try again."
                            : error?.response?.data?.message ||
                                  "Your answers couldn't be submitted. Check your connection and try again."
                    );
                },
            }
        );
    };

    const handleSubmitQuiz = () => {
        if (answeredQuestions < questions.length) {
            return;
        }

        performSubmit();
    };

    // A Self-Test ends when its last unchecked question is checked: that
    // check saves the attempt — the same submit a Final makes — so completion,
    // progress and the learning path move on exactly as before. Checking does
    // not change any answer, so the payload built here already holds them all.
    const handleCheckAnswer = () => {
        if (!currentQuestion?.id || !questionStates[currentQuestion.id]?.answered) return;
        checkCurrentAnswer();
        const othersChecked = questions.every(
            (q) => q.id === currentQuestion.id || questionStates[q.id]?.answerChecked === true
        );
        if (isPractice && othersChecked && !isSubmitted) {
            performSubmit();
        }
    };

    // The timer (persisted per-attempt, see QuizTimer) fires this once its
    // deadline passes — including immediately on a refresh that lands after
    // time was already up. Auto-submit whatever was answered so far rather
    // than waiting on a confirmation click that may never come.
    const handleTimeUp = () => {
        if (isSubmitted || submitQuizMutation.isPending) return;
        performSubmit();
    };

    // Fetches once submitted, or on landing back on a quiz already attempted
    // in an earlier visit — the result endpoint 404s on a bare unattempted
    // quiz. Same endpoint/shape the full /student/result page uses, including
    // each question's correctAnswer (stripped from useQuiz above so a
    // student can't see it mid-attempt).
    const { data: resultData, isLoading: isResultLoading } = useQuizResult(quizId, {
        // A Self-Test has no result screen to feed; its summary is worked out
        // from the answers on screen.
        enabled: !isPractice && (isSubmitted || Boolean(quiz?.attemptStatus?.attemptsUsed > 0)),
    });

    const submissionResult = resultData?.data || resultData;

    const parsedSubmissionAnswers = useMemo(() => {
        if (!submissionResult?.answers) return [];
        if (typeof submissionResult.answers === "string") {
            try {
                return JSON.parse(submissionResult.answers);
            } catch {
                return [];
            }
        }
        return submissionResult.answers;
    }, [submissionResult]);

    const correctCount = useMemo(() => {
        if (!submissionResult?.quiz?.questions) return 0;
        return submissionResult.quiz.questions.filter((q) => {
            const userAnswer = parsedSubmissionAnswers.find(
                (a) => a.questionId === q.id
            );
            return checkAnswerCorrectness(
                resolveQuestionType(q.questionType),
                userAnswer?.answer ?? userAnswer?.selectedOption,
                q.correctAnswer,
                q.options
            );
        }).length;
    }, [submissionResult, parsedSubmissionAnswers]);

    const resultHref = resultReturnTo
        ? `/student/result/${quizId}?from=${encodeURIComponent(resultReturnTo)}`
        : `/student/result/${quizId}`;

    if (isLoading) {
        return <Loader />;
    }

    if (isError || !quiz) {
        return (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-8 text-center">
                <h2 className="text-xl font-semibold text-foreground">
                    Quiz not found
                </h2>

                <p className="mt-2 text-muted-foreground">
                    Unable to load this quiz.
                </p>
            </div>
        );
    }

    // A Self-Test stays on its questions after it saves — the student keeps
    // the answers and reasons in front of them — so only a graded quiz swaps
    // to the result summary.
    if (isSubmitted && !isPractice) {
        return (
            <QuizResultSummary
                quizTitle={quiz.title}
                isLoading={isResultLoading || !submissionResult}
                // The server's tally is authoritative; the client-side check
                // only covers a response that predates it.
                correctCount={submissionResult?.correctCount ?? correctCount}
                totalQuestions={questions.length}
                percentage={submissionResult?.percentage ?? 0}
                passed={Boolean(submissionResult?.passed)}
                resultHref={resultHref}
                onNextContent={onNextContent}
                speechLanguage={speechLanguage}
            />
        );
    }

    if (showCompletedCard) {
        // submissionResult is only known once its fetch (enabled above for
        // any prior attempt) resolves — the icon/badge stay neutral until then.
        const knowsOutcome = !isResultLoading && submissionResult != null;
        const passed = Boolean(submissionResult?.passed);

        return (
            <div className="rounded-2xl border border-border bg-card p-6 text-center sm:p-8">
                <div
                    className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
                        knowsOutcome && !passed
                            ? "bg-rose-500/10 text-rose-400"
                            : "bg-emerald-500/10 text-emerald-400"
                    }`}
                >
                    <CheckCircle2 className="h-5 w-5" aria-hidden />
                </div>
                {knowsOutcome && (
                    <div
                        className={`mx-auto mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                            passed
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                                : "bg-rose-500/15 text-rose-400 border border-rose-500/25"
                        }`}
                    >
                        {passed ? "Passed" : "Failed"}
                    </div>
                )}
                <h2 className="mt-3 text-lg font-semibold text-foreground">
                    You have completed the quiz
                </h2>
                <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                    {allowance.canAttempt
                        ? `You can view your result or retake “${quiz.title}”.`
                        : `You've used all ${allowance.maxAttempts} attempt${allowance.maxAttempts === 1 ? "" : "s"} allowed for “${quiz.title}”.${onNextContent ? " You can carry on with the course." : ""}`}
                </p>
                <div className="mx-auto mt-6 flex max-w-md flex-col gap-2 sm:flex-row sm:justify-center">
                    <Button asChild className="inline-flex flex-1 items-center justify-center">
                        <Link href={resultHref}>View result</Link>
                    </Button>
                    {allowance.canAttempt && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setReattempting(true)}
                            className="flex-1"
                        >
                            Retake
                        </Button>
                    )}
                    {/* Out of attempts, the quiz is done whether passed or not
                        (the server's completion rule), so the next step is open. */}
                    {onNextContent && !allowance.canAttempt && (
                        <Button type="button" variant="outline" onClick={onNextContent} className="flex-1 whitespace-nowrap">
                            Continue course
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

    return (
        <>
            <div className="space-y-2 sm:space-y-3">
                <QuizHeader
                    quiz={quiz}
                    onBack={onBack}
                    onTimeUp={handleTimeUp}
                    answeredCount={answeredQuestions}
                />

                {!isPractice && allowance && (allowance.attemptsUsed > 0 || !allowance.unlimitedAttempts) && (
                    <p className="px-1 text-xs font-medium text-muted-foreground">
                        Attempt {allowance.attemptsUsed + 1}
                        {allowance.unlimitedAttempts ? "" : ` of ${allowance.maxAttempts}`}
                    </p>
                )}

                {submitError && !showSubmitModal && !isPractice && (
                    <p
                        role="alert"
                        className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-500"
                    >
                        {submitError}
                    </p>
                )}

                <QuestionCard
                    question={currentQuestion}
                    selectedAnswer={currentAnswer}
                    onSelectAnswer={answerCurrentQuestion}
                    questionNumber={currentQuestionIndex + 1}
                    totalQuestions={questions.length}
                    speechLanguage={speechLanguage}
                    // The server's decision, not this component's: it is true
                    // only for a qualifying test on the student's second or
                    // later attempt, and the hint text is absent otherwise.
                    hintsUnlocked={quiz.hintsUnlocked === true}
                    onViewHint={viewCurrentHint}
                    // Also the server's decision: true only for a Self-Test,
                    // the one quiz whose answer key is sent to the student.
                    revealAnswers={isPractice}
                    answerChecked={currentAnswerChecked}
                    onCheckAnswer={handleCheckAnswer}
                />

                <QuizNavigation
                    questions={questions}
                    currentQuestionIndex={currentQuestionIndex}
                    questionStates={questionStates}
                    canGoPrevious={currentQuestionIndex > 0}
                    canGoNext={currentQuestionIndex < questions.length - 1}
                    onPrevious={goToPrevious}
                    onNext={goToNext}
                    onJumpTo={goToQuestion}
                    onSkip={isPractice ? undefined : skipCurrentQuestion}
                    onSubmit={() => setShowSubmitModal(true)}
                    isSubmitting={submitQuizMutation.isPending}
                    practice={isPractice}
                    checkedResults={checkedResults}
                />

                {isPractice && (
                    <PracticeStatus
                        checkedCount={summary.checkedCount}
                        totalQuestions={questions.length}
                        allChecked={practiceAllChecked}
                        saving={submitQuizMutation.isPending}
                        saved={isSubmitted}
                        saveError={submitError}
                        onRetrySave={performSubmit}
                        rightCount={practiceRight}
                        markedCount={practiceMarked.length}
                        onNextContent={onNextContent}
                        onBack={onBack}
                    />
                )}
            </div>

            <QuizSubmitModal
                isOpen={showSubmitModal}
                onClose={handleCloseSubmitModal}
                onConfirm={handleSubmitQuiz}
                totalQuestions={questions.length}
                answeredQuestions={answeredQuestions}
                skippedQuestions={summary.skippedUnansweredCount}
                isSubmitting={
                    submitQuizMutation.isPending
                }
                errorMessage={submitError}
            />
        </>
    );
}

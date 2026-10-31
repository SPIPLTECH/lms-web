"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CameraOff, Maximize, ShieldAlert, WifiOff, X } from "lucide-react";

import Loader from "@/components/common/Loader";
import Button from "@/components/ui/Button";
import QuestionCard from "@/components/student/attempt/QuestionCard";
import QuizHeader from "@/components/student/attempt/QuizHeader";
import QuizNavigation from "@/components/student/attempt/QuizNavigation";
import QuizSubmitModal from "@/components/student/attempt/QuizSubmitModal";
import { useProctoredAttempt, useSubmitProctoredAttempt } from "@/hooks/queries/student/useProctoredExam";
import useQuizAttemptTracker from "@/hooks/useQuizAttemptTracker";
import { classifyExamError, localDeadlineMs } from "@/lib/proctoring/examLogic";
import { isFullscreenSupported } from "@/lib/proctoring/examLock";
import useAnswerSync from "@/features/proctoring/hooks/useAnswerSync";

function Blocker({ icon: Icon, title, children, action }) {
    return (
        <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[60] flex items-center justify-center bg-background p-6">
            <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center">
                <Icon className="h-8 w-8 text-amber-500" aria-hidden />
                <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                <p className="text-sm text-muted-foreground">{children}</p>
                {action}
            </div>
        </div>
    );
}

/**
 * The exam itself, on the LMS's own question screens. Answers go to the server as they change. The
 * timer is the server's deadline. Monitoring runs in the background and shows nothing unless the
 * student has to act.
 */
export default function ExamRoom({ session, camera, monitoring, microphoneStatus, onEnded, onSuperseded, onRecheckRequired }) {
    const attempt = useProctoredAttempt(session.attemptId);
    const state = attempt.data;
    const questions = state?.questions ?? EMPTY;
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [idleGraceElapsed, setIdleGraceElapsed] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [timeUp, setTimeUp] = useState(false);
    const [restoring, setRestoring] = useState(false);
    const submit = useSubmitProctoredAttempt(session.quizId);
    const submittingRef = useRef(false);
    const skipFlushRef = useRef(false);
    const allowLeaveRef = useRef(false);

    useEffect(() => {
        if (camera.cameraStatus !== "IDLE" || idleGraceElapsed) return undefined;
        const timer = setTimeout(() => setIdleGraceElapsed(true), 2500);
        return () => clearTimeout(timer);
    }, [camera.cameraStatus, idleGraceElapsed]);

    useEffect(() => {
        if (timeUp || typeof window === "undefined") return undefined;
        const onBeforeUnload = (event) => {
            if (allowLeaveRef.current) return;
            event.preventDefault();
            event.returnValue = "";
        };
        window.addEventListener("beforeunload", onBeforeUnload);
        return () => window.removeEventListener("beforeunload", onBeforeUnload);
    }, [timeUp]);

    useEffect(() => {
        if (timeUp || typeof window === "undefined") return undefined;
        const guardState = { proctoredExamGuard: session.attemptId };
        if (!window.history.state?.proctoredExamGuard) {
            window.history.pushState(guardState, "", window.location.href);
        }
        const onPopState = () => {
            if (allowLeaveRef.current) return;
            window.history.pushState(guardState, "", window.location.href);
            setShowLeaveModal(true);
        };
        window.addEventListener("popstate", onPopState);
        return () => window.removeEventListener("popstate", onPopState);
    }, [timeUp, session.attemptId]);

    const tracker = useQuizAttemptTracker({
        // Scoped to this attempt, so another attempt at the quiz never inherits it.
        quizId: session.attemptId,
        questions,
        active: Boolean(state?.questions),
        serverAnswers: state?.answers ?? null,
    });

    const sync = useAnswerSync({
        attemptId: session.attemptId,
        questionStates: tracker.questionStates,
        serverAnswers: state?.answers,
        enabled: tracker.hydrated,
        onEnded,
        onSuperseded,
        onRecheckRequired,
    });

    /** Submits whatever was saved. On failure the student stays here with a retry, and never a false success. */
    const finish = useCallback(async () => {
        if (submittingRef.current) return;
        submittingRef.current = true;
        setSubmitError("");
        try {
            if (!skipFlushRef.current) {
                const unsaved = await sync.flush();
                if (unsaved > 0) {
                    skipFlushRef.current = true;
                    setSubmitError(`${unsaved} ${unsaved === 1 ? "answer" : "answers"} could not be saved yet. Check your connection and try again. If it keeps failing, submitting again finishes with what has been saved.`);
                    setShowSubmitModal(true);
                    return;
                }
            }
            await submit.mutateAsync(session.attemptId);
            allowLeaveRef.current = true;
            tracker.clearStoredProgress();
            onEnded();
        } catch (error) {
            const kind = classifyExamError(error);
            if (kind === "ENDED") {
                allowLeaveRef.current = true;
                tracker.clearStoredProgress();
                onEnded();
            } else if (kind === "SUPERSEDED") {
                onSuperseded();
            } else {
                setSubmitError(error?.response?.data?.message || "Your exam could not be submitted. Check your connection and try again.");
                setShowSubmitModal(true);
            }
        } finally {
            submittingRef.current = false;
        }
    }, [sync, submit, session.attemptId, tracker, onEnded, onSuperseded]);

    // No questions came back: the server is saying why, and each reason has its own screen.
    const unavailable = state && !state.questions;
    useEffect(() => {
        if (!unavailable) return;
        if (state.activeElsewhere) onSuperseded();
        else if (state.identityRecheckRequired) onRecheckRequired();
        else if (state.status !== "IN_PROGRESS") onEnded();
    }, [unavailable, state, onEnded, onSuperseded, onRecheckRequired]);

    const handleTimeUp = () => {
        setTimeUp(true);
        setShowSubmitModal(false);
        finish();
    };

    const restoreFullscreen = async () => {
        setRestoring(true);
        try {
            await monitoring.requestFullscreen();
        } finally {
            setRestoring(false);
        }
    };

    if (attempt.isLoading || (state?.questions && !tracker.hydrated)) {
        return (
            <div className="flex min-h-dvh items-center justify-center">
                <Loader />
            </div>
        );
    }

    if (attempt.isError || !state?.questions) {
        return (
            <Blocker icon={AlertTriangle} title="The exam could not be loaded" action={<Button type="button" onClick={() => attempt.refetch()}>Try again</Button>}>
                Your answers are safe. Your timer keeps running, so please try again now.
            </Blocker>
        );
    }

    const quiz = { id: session.quizId, title: state.quiz?.title, quizTag: state.quiz?.quizTag, questions, timeLimit: state.durationMinutes };
    const fixedDeadline = localDeadlineMs(state.deadlineAt, state.serverNow, attempt.dataUpdatedAt);
    const cameraBootstrapping = camera.cameraStatus === "IDLE" && !idleGraceElapsed;
    const cameraOff = camera.cameraStatus !== "READY" && camera.cameraStatus !== "REQUESTING" && !cameraBootstrapping;
    const cappedWarnings = Math.min(monitoring.warnings, monitoring.maxWarnings);
    const isFinalWarningStanding = monitoring.maxWarnings > 1 && cappedWarnings === monitoring.maxWarnings - 1;

    return (
        <div className="flex h-dvh select-none flex-col overflow-hidden print:hidden [&_input]:select-text [&_textarea]:select-text" onDragStart={(event) => event.preventDefault()}>
            {showLeaveModal && !timeUp && (
                <div role="dialog" aria-modal="true" aria-label="Stay in your proctored exam?" className="fixed inset-0 z-[70] flex items-center justify-center bg-background/85 p-6 backdrop-blur-sm">
                    <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center shadow-xl">
                        <ShieldAlert className="h-8 w-8 text-amber-500" aria-hidden />
                        <h2 className="text-lg font-semibold text-foreground">Stay in your proctored exam?</h2>
                        <p className="text-sm text-muted-foreground">
                            Leaving this page does not pause your exam timer, and navigation away is recorded for instructor review. Stay here to continue answering, or submit your exam if you are finished.
                        </p>
                        <div className="mt-1 flex w-full flex-col gap-2 sm:flex-row">
                            <Button type="button" onClick={() => setShowLeaveModal(false)} className="flex-1">
                                Stay in exam
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setShowLeaveModal(false);
                                    setShowSubmitModal(true);
                                }}
                                className="flex-1"
                            >
                                Review &amp; submit
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            {isFullscreenSupported() && !monitoring.isFullscreen && !timeUp && (
                <Blocker
                    icon={Maximize}
                    title="Return to fullscreen"
                    action={
                        <Button type="button" onClick={restoreFullscreen} loading={restoring}>
                            Return to fullscreen
                        </Button>
                    }
                >
                    This exam runs in fullscreen, and leaving it is recorded. Your timer keeps running.
                </Blocker>
            )}
            {monitoring.isFullscreen && !monitoring.isWindowFocused && !timeUp && (
                <Blocker icon={ShieldAlert} title="Return to the exam" action={<Button type="button" onClick={() => window.focus()}>Return to the exam</Button>}>
                    The exam is hidden while this window is not in focus, and leaving it is recorded.
                </Blocker>
            )}

            {cameraOff && !timeUp && (
                <Blocker
                    icon={CameraOff}
                    title="Your camera has stopped"
                    action={
                        <Button type="button" onClick={camera.requestCamera}>
                            Reconnect camera
                        </Button>
                    }
                >
                    {camera.errorMessage || "This exam needs your camera."} Your timer keeps running, and your answers are safe. If you cannot get it back, contact your instructor.
                </Blocker>
            )}

            {!monitoring.isOnline && (
                <p role="alert" className="flex items-center justify-center gap-2 bg-amber-500/15 px-4 py-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                    <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
                    Your connection was lost. Your answers will be sent when it returns. Do not close this window.
                </p>
            )}
            {monitoring.isOnline && sync.retrying && (
                <p role="alert" className="flex items-center justify-center gap-2 bg-amber-500/15 px-4 py-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                    An answer is not saved yet. Trying again. Check your connection.
                </p>
            )}
            {camera.errorMessage && !cameraOff && (
                <p role="alert" className="flex items-center justify-center gap-2 bg-amber-500/15 px-4 py-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                    <CameraOff className="h-4 w-4 shrink-0" aria-hidden />
                    {camera.errorMessage}
                </p>
            )}
            {timeUp && (
                <p role="alert" className="bg-rose-600 px-4 py-1.5 text-center text-xs font-bold text-white">
                    Time is up. Submitting your saved answers…
                </p>
            )}
            {monitoring.activeWarningMessage && (
                <div role="alert" className="flex items-center justify-center gap-3 bg-rose-500/15 px-4 py-1.5 text-sm font-semibold text-rose-700 dark:text-rose-300">
                    <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden />
                    <span>{monitoring.activeWarningMessage}</span>
                    {monitoring.canDismissWarning ? (
                        <button type="button" onClick={monitoring.clearWarningMessage} aria-label="Dismiss warning" className="rounded p-0.5 hover:bg-rose-500/20">
                            <X className="h-4 w-4" aria-hidden />
                        </button>
                    ) : (
                        <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">Ongoing</span>
                    )}
                </div>
            )}

            <main className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2 sm:gap-3 sm:p-3">
                <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 sm:gap-3">
                    {cappedWarnings > 0 && (
                        <div className="flex items-center justify-end">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${isFinalWarningStanding ? "border-rose-500/35 bg-rose-500/10 text-rose-700 dark:text-rose-300" : "border-amber-500/35 bg-amber-500/10 text-amber-800 dark:text-amber-300"}`}>
                                <ShieldAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                Warnings: {cappedWarnings} / {monitoring.maxWarnings}
                                {isFinalWarningStanding ? " · Final warning" : ""}
                            </span>
                        </div>
                    )}
                    <QuizHeader quiz={quiz} hideBack fixedDeadline={fixedDeadline} onTimeUp={handleTimeUp} answeredCount={tracker.summary.answeredCount} />
                    <QuestionCard
                        question={tracker.currentQuestion}
                        selectedAnswer={tracker.currentAnswer}
                        onSelectAnswer={tracker.answerCurrentQuestion}
                        questionNumber={tracker.currentQuestionIndex + 1}
                        totalQuestions={questions.length}
                        hintsUnlocked={state.quiz?.hintsUnlocked === true}
                        onViewHint={tracker.viewCurrentHint}
                    />
                    <QuizNavigation
                        questions={questions}
                        currentQuestionIndex={tracker.currentQuestionIndex}
                        questionStates={tracker.questionStates}
                        canGoPrevious={tracker.currentQuestionIndex > 0}
                        canGoNext={tracker.currentQuestionIndex < questions.length - 1}
                        onPrevious={tracker.goToPrevious}
                        onNext={tracker.goToNext}
                        onJumpTo={tracker.goToQuestion}
                        onSkip={tracker.skipCurrentQuestion}
                        onSubmit={() => setShowSubmitModal(true)}
                        isSubmitting={submit.isPending}
                    />
                </div>
            </main>

            {/* Small, and out of the way of the questions and the navigation. */}
            <div className="fixed bottom-2 right-2 z-40 w-24 overflow-hidden rounded-lg border border-border bg-black shadow-lg sm:w-28">
                <video ref={camera.attachVideo} muted playsInline autoPlay aria-label="Your camera" className="aspect-[4/3] w-full object-cover" />
            </div>
            <span className="sr-only" aria-live="polite">
                {monitoring.warnings > 0 ? `${monitoring.warnings} of ${monitoring.maxWarnings} warnings` : ""}
                {microphoneStatus === "DENIED" || microphoneStatus === "UNAVAILABLE" ? " Microphone not available." : ""}
            </span>

            <QuizSubmitModal
                isOpen={showSubmitModal}
                onClose={() => {
                    setSubmitError("");
                    setShowSubmitModal(false);
                }}
                onConfirm={finish}
                totalQuestions={questions.length}
                answeredQuestions={tracker.summary.answeredCount}
                skippedQuestions={tracker.summary.skippedUnansweredCount}
                isSubmitting={submit.isPending}
                errorMessage={submitError}
            />
        </div>
    );
}

const EMPTY = [];

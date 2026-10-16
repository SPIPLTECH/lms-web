"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
    createAttemptState,
    markHintViewed,
    markSkipped,
    markVisited,
    reconcileWithQuestions,
    setAnswer as setAnswerIn,
    summarize,
    toAnswersPayload,
    toQuestionStatesPayload,
} from "@/lib/quizAttemptState";

/**
 * One sessionStorage key per quiz attempt — same scoping convention as
 * getQuizTimerStorageKey — so a refresh resumes the same attempt, while a new
 * attempt (attemptsUsed incremented server-side) never inherits the previous
 * attempt's progress.
 */
export function getQuizAttemptStorageKey(quizId, attemptsUsed = 0) {
    if (!quizId) return undefined;
    return `quiz-progress:${quizId}:${attemptsUsed + 1}`;
}

/**
 * Reads stored progress for this attempt. Tolerates the pre-tracking shape
 * ({ answers, visitedIndices }) written by an earlier build, so a student
 * mid-attempt when the app updates doesn't lose their answers — the indices
 * are resolved back to question ids against the current question order.
 */
function readStoredProgress(storageKey, questions) {
    if (typeof window === "undefined" || !storageKey) return null;

    let parsed;
    try {
        const raw = window.sessionStorage.getItem(storageKey);
        if (!raw) return null;
        parsed = JSON.parse(raw);
    } catch {
        return null;
    }

    const currentQuestionIndex = Number(parsed?.currentQuestionIndex) || 0;

    if (parsed?.questionStates && typeof parsed.questionStates === "object") {
        return {
            currentQuestionIndex,
            questionStates: reconcileWithQuestions(parsed.questionStates, questions),
        };
    }

    // Legacy shape.
    let migrated = createAttemptState(questions);
    const visitedIndices = Array.isArray(parsed?.visitedIndices) ? parsed.visitedIndices : [0];
    for (const index of visitedIndices) {
        const question = questions[index];
        if (question?.id) migrated = markVisited(migrated, question.id);
    }
    const legacyAnswers = parsed?.answers && typeof parsed.answers === "object" ? parsed.answers : {};
    for (const [questionId, answer] of Object.entries(legacyAnswers)) {
        migrated = setAnswerIn(migrated, questionId, answer);
    }

    return { currentQuestionIndex, questionStates: reconcileWithQuestions(migrated, questions) };
}

/**
 * Question-level tracking for a quiz attempt: which question is open, and for
 * every question its answer, status, and visit/skip/hint history. Owns the
 * per-attempt sessionStorage persistence so a refresh mid-attempt lands back
 * on the same question with the same state.
 *
 * `active` is whether an attempt is actually being taken right now. It is
 * false while the caller is showing something else over the quiz — the
 * "you have already completed this" card, or the post-submit summary — and
 * nothing is tracked or persisted then. That matters at submit: the server's
 * attemptsUsed goes up, so `attemptsUsed` here (and with it the storage key)
 * rolls over to the NEXT attempt while this component is still mounted. Left
 * ungated, the attempt just submitted would be written into the next
 * attempt's slot and a retake would open pre-answered.
 *
 * Purely a state container — it renders nothing and knows nothing about the
 * quiz UI. The attempt screen reads `questionStates` for the navigator and
 * calls `buildSubmitPayload()` when the student submits.
 */
export default function useQuizAttemptTracker({ quizId, questions, attemptsUsed = 0, active = true }) {
    const [questionStates, setQuestionStates] = useState(() => createAttemptState(questions));
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

    // The storage key the state in hand was loaded for, or null before any
    // load. The persistence effect below writes only when it matches the
    // current key, so pre-hydration defaults can never clobber stored
    // progress, and state belonging to one attempt can never be written under
    // another attempt's key.
    const [hydratedKey, setHydratedKey] = useState(null);

    const storageKey = getQuizAttemptStorageKey(quizId, attemptsUsed);
    const hydrated = hydratedKey != null && hydratedKey === storageKey;

    // Keeps the records in step with the question set without making the
    // hydration effect below depend on a new array identity every render.
    const questionsRef = useRef(questions);
    questionsRef.current = questions;

    // Loads the state for the current attempt. Re-runs when the key changes —
    // which is how a retake starts clean rather than inheriting the attempt
    // before it.
    useEffect(() => {
        if (!active || hydrated || !quizId || questions.length === 0) return;

        const stored = readStoredProgress(storageKey, questions);
        const base = stored?.questionStates ?? createAttemptState(questions);

        // The first question is open the moment the attempt starts, so it is
        // VISITED from the outset rather than only once the student navigates.
        const startIndex = Math.min(Math.max(stored?.currentQuestionIndex ?? 0, 0), questions.length - 1);
        setQuestionStates(markVisited(base, questions[startIndex]?.id));
        setCurrentQuestionIndex(startIndex);
        setHydratedKey(storageKey);
    }, [active, hydrated, quizId, questions, storageKey]);

    // A quiz edited between visits (or an attempt restored against a changed
    // question set) must not leave records for questions that are gone, or
    // questions with no record at all.
    useEffect(() => {
        if (!hydrated) return;
        setQuestionStates((prev) => reconcileWithQuestions(prev, questionsRef.current));
    }, [hydrated, questions]);

    useEffect(() => {
        if (!active || !hydrated || !storageKey || typeof window === "undefined") return;
        try {
            window.sessionStorage.setItem(
                storageKey,
                JSON.stringify({ currentQuestionIndex, questionStates })
            );
        } catch {
            // A full or unavailable sessionStorage costs the refresh-resume,
            // not the attempt — the in-memory state is unaffected.
        }
    }, [active, hydrated, storageKey, currentQuestionIndex, questionStates]);

    const currentQuestion = questions[currentQuestionIndex];
    const currentQuestionId = currentQuestion?.id;

    /** Opens a question, recording the visit. Out-of-range indices are ignored. */
    const goToQuestion = useCallback(
        (index) => {
            if (index < 0 || index >= questionsRef.current.length) return;
            const questionId = questionsRef.current[index]?.id;
            setCurrentQuestionIndex(index);
            setQuestionStates((prev) => markVisited(prev, questionId));
        },
        []
    );

    const goToNext = useCallback(
        () => goToQuestion(currentQuestionIndex + 1),
        [goToQuestion, currentQuestionIndex]
    );
    const goToPrevious = useCallback(
        () => goToQuestion(currentQuestionIndex - 1),
        [goToQuestion, currentQuestionIndex]
    );

    const answerCurrentQuestion = useCallback(
        (answer) => {
            if (!currentQuestionId) return;
            setQuestionStates((prev) => setAnswerIn(prev, currentQuestionId, answer));
        },
        [currentQuestionId]
    );

    /**
     * Skips the current question and moves on. On the last question there is
     * nowhere to move to — the skip is still recorded.
     */
    const skipCurrentQuestion = useCallback(() => {
        if (!currentQuestionId) return;
        setQuestionStates((prev) => markSkipped(prev, currentQuestionId));
        if (currentQuestionIndex < questionsRef.current.length - 1) {
            goToQuestion(currentQuestionIndex + 1);
        }
    }, [currentQuestionId, currentQuestionIndex, goToQuestion]);

    const viewCurrentHint = useCallback(() => {
        if (!currentQuestionId) return;
        setQuestionStates((prev) => markHintViewed(prev, currentQuestionId));
    }, [currentQuestionId]);

    /** Drops this attempt's stored progress — called once it is submitted. */
    const clearStoredProgress = useCallback(() => {
        if (!storageKey || typeof window === "undefined") return;
        try {
            window.sessionStorage.removeItem(storageKey);
        } catch {
            // Nothing to recover from: the attempt is already submitted.
        }
    }, [storageKey]);

    const summary = useMemo(() => summarize(questionStates, questions), [questionStates, questions]);

    /** The submit body: graded answers plus the activity the server can't see. */
    const buildSubmitPayload = useCallback(
        () => ({
            answers: toAnswersPayload(questionStates),
            questionStates: toQuestionStatesPayload(questionStates),
        }),
        [questionStates]
    );

    return {
        questionStates,
        currentQuestionIndex,
        currentQuestion,
        currentAnswer: currentQuestionId ? questionStates[currentQuestionId]?.answer ?? undefined : undefined,
        summary,
        hydrated,
        goToQuestion,
        goToNext,
        goToPrevious,
        answerCurrentQuestion,
        skipCurrentQuestion,
        viewCurrentHint,
        buildSubmitPayload,
        clearStoredProgress,
    };
}

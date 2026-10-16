/**
 * The question-level state of one quiz attempt, as pure functions over a
 * plain object — no React, so the rules are testable on their own and the
 * hook around them (useQuizAttemptTracker) stays a thin wrapper.
 *
 * Shape: { [questionId]: QuestionAttemptState }, mirroring the QuestionAttempt
 * model the backend writes at submit. `status` is where a question stands now;
 * `visited` and `skipped` are "did this ever happen" flags, which `status`
 * alone cannot carry — a question that was skipped and then answered is
 * ANSWERED with `skipped` still true.
 */

export const QUESTION_STATUS = {
    NOT_VISITED: "NOT_VISITED",
    VISITED: "VISITED",
    ANSWERED: "ANSWERED",
    SKIPPED: "SKIPPED",
};

/** An answer the student has actually given, as opposed to a cleared one. */
export function hasAnswer(answer) {
    if (answer === undefined || answer === null || answer === "") return false;
    if (Array.isArray(answer)) return answer.length > 0;
    if (typeof answer === "object") return Object.keys(answer).length > 0;
    return true;
}

/**
 * The status implied by the facts about a question. Answering always wins, so
 * returning to a skipped question and answering it makes it ANSWERED; skip
 * outranks a bare visit, since skipping is deliberate and visiting is not.
 *
 * Mirrors resolveQuestionStatus() in the backend's quiz.service.js — the
 * server re-derives status from its own grading at submit, so the two must
 * agree or the navigator and the stored record would tell different stories.
 */
export function resolveStatus({ answered, skipped, visited }) {
    if (answered) return QUESTION_STATUS.ANSWERED;
    if (skipped) return QUESTION_STATUS.SKIPPED;
    if (visited) return QUESTION_STATUS.VISITED;
    return QUESTION_STATUS.NOT_VISITED;
}

function blankState(questionId) {
    return {
        questionId,
        answer: null,
        status: QUESTION_STATUS.NOT_VISITED,
        visited: false,
        skipped: false,
        answered: false,
        hintViewed: false,
        firstVisitedAt: null,
        lastVisitedAt: null,
        answeredAt: null,
        skippedAt: null,
    };
}

/** One record per question, all NOT_VISITED — the state an attempt starts in. */
export function createAttemptState(questions = []) {
    const state = {};
    for (const question of questions) {
        if (question?.id) state[question.id] = blankState(question.id);
    }
    return state;
}

/**
 * `state` reconciled against the quiz's current question set: records for
 * questions no longer in the quiz are dropped, and questions with no record
 * yet (a quiz edited mid-attempt, or state restored from an older shape) get
 * a blank one. Returns `state` itself when nothing needed changing, so React
 * callers don't re-render over a no-op.
 */
export function reconcileWithQuestions(state = {}, questions = []) {
    const ids = questions.map((q) => q?.id).filter(Boolean);
    const sameSize = ids.length === Object.keys(state).length;
    if (sameSize && ids.every((id) => state[id])) return state;

    const next = {};
    for (const id of ids) {
        next[id] = state[id] ? { ...blankState(id), ...state[id] } : blankState(id);
    }
    return next;
}

/** Applies `changes` to one question's record, leaving every other untouched. */
function patch(state, questionId, changes) {
    const current = state[questionId] || blankState(questionId);
    const merged = { ...current, ...changes };
    return {
        ...state,
        [questionId]: {
            ...merged,
            status: resolveStatus(merged),
        },
    };
}

/**
 * Opening a question. Visiting never answers it and never clears a skip —
 * it only records that the student has now seen it. Repeat visits move
 * `lastVisitedAt` and nothing else, so revisiting the same question any
 * number of times is idempotent as far as status goes.
 */
export function markVisited(state, questionId, now = Date.now()) {
    if (!questionId) return state;
    const current = state[questionId] || blankState(questionId);
    return patch(state, questionId, {
        visited: true,
        firstVisitedAt: current.firstVisitedAt ?? now,
        lastVisitedAt: now,
    });
}

/**
 * Answering a question, or clearing its answer.
 *
 * Updates the question's existing record in place — changing an answer
 * overwrites the one before it and never adds a second record. Clearing an
 * answer (deselecting every option) drops the question back to VISITED, or
 * back to SKIPPED if it had been skipped earlier, rather than leaving it
 * claiming an answer it no longer holds.
 */
export function setAnswer(state, questionId, answer, now = Date.now()) {
    if (!questionId) return state;
    const answered = hasAnswer(answer);
    const current = state[questionId] || blankState(questionId);

    return patch(state, questionId, {
        answer: answered ? answer : null,
        answered,
        // Answering a question you somehow never opened still counts as
        // having seen it.
        visited: true,
        firstVisitedAt: current.firstVisitedAt ?? now,
        lastVisitedAt: now,
        answeredAt: answered ? now : null,
    });
}

/**
 * Skipping a question. A question that already carries an answer is not
 * skipped — Skip there just moves on, leaving the answer as it stands.
 */
export function markSkipped(state, questionId, now = Date.now()) {
    if (!questionId) return state;
    const current = state[questionId] || blankState(questionId);
    if (current.answered) return state;

    return patch(state, questionId, {
        visited: true,
        skipped: true,
        firstVisitedAt: current.firstVisitedAt ?? now,
        lastVisitedAt: now,
        skippedAt: current.skippedAt ?? now,
    });
}

/** Records that the student revealed this question's hint. */
export function markHintViewed(state, questionId, now = Date.now()) {
    if (!questionId) return state;
    const current = state[questionId] || blankState(questionId);
    if (current.hintViewed) return state;
    return patch(state, questionId, { hintViewed: true, lastVisitedAt: now });
}

/**
 * Live tallies for the attempt in progress, counted from the records — the
 * same fold the backend applies to the stored rows at submit, so the header
 * and submit modal show what the attempt will actually be scored as.
 */
export function summarize(state = {}, questions = []) {
    const records = questions.map((q) => state[q?.id]).filter(Boolean);
    const answered = records.filter((r) => r.answered).length;
    const visited = records.filter((r) => r.visited).length;

    return {
        totalQuestions: questions.length,
        answeredCount: answered,
        unansweredCount: questions.length - answered,
        // Ever skipped, including questions the student went back and
        // answered — the attempt's skip history.
        skippedCount: records.filter((r) => r.skipped).length,
        // Skipped and still not answered: what is actually outstanding, and
        // the only one of the two worth putting in front of a student about
        // to submit.
        skippedUnansweredCount: records.filter((r) => r.skipped && !r.answered).length,
        visitedCount: visited,
        notVisitedCount: questions.length - visited,
    };
}

/** The answers half of the submit payload: one entry per answered question. */
export function toAnswersPayload(state = {}) {
    return Object.values(state)
        .filter((record) => record.answered && hasAnswer(record.answer))
        .map((record) => ({ questionId: record.questionId, answer: record.answer }));
}

/**
 * The activity half of the submit payload — visit/skip/hint history for every
 * question the student touched. Untouched questions are left out: the server
 * already knows the full question set and records them as NOT_VISITED.
 *
 * Grading facts (correctness, marks) are deliberately absent. The server
 * scores the answers itself; sending a client-side verdict would be telling
 * it what it is there to decide.
 */
export function toQuestionStatesPayload(state = {}) {
    const toIso = (value) => (value ? new Date(value).toISOString() : null);

    return Object.values(state)
        .filter((record) => record.visited || record.skipped || record.answered || record.hintViewed)
        .map((record) => ({
            questionId: record.questionId,
            status: record.status,
            visited: record.visited,
            skipped: record.skipped,
            hintViewed: record.hintViewed,
            firstVisitedAt: toIso(record.firstVisitedAt),
            lastVisitedAt: toIso(record.lastVisitedAt),
            answeredAt: toIso(record.answeredAt),
            skippedAt: toIso(record.skippedAt),
        }));
}

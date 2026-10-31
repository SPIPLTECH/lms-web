/**
 * The exam page's decisions that need no browser, kept apart so they can be tested on their own.
 */

/**
 * Shortcuts that switch away from the exam. The system normally handles these before the
 * page sees them; under Keyboard Lock they arrive here and can be cancelled. Esc is included:
 * a short press does nothing, and leaving fullscreen needs a long press, which is then
 * detected as a fullscreen exit.
 */
export function isLeaveShortcut(event) {
    const key = String(event.key || "").toLowerCase();
    if (key === "escape" || key === "meta" || key === "os") return true;
    if (event.altKey && (key === "tab" || key === "f4" || key === "escape")) return true;
    if ((event.ctrlKey || event.metaKey) && (key === "tab" || key === "w" || key === "t" || key === "n")) return true;
    return Boolean(event.metaKey && (key === "tab" || key === "d" || key === "m"));
}

export function isScreenshotShortcut(event) {
    const key = String(event.key || "").toLowerCase();
    const modifier = event.ctrlKey || event.metaKey;
    if (event.key === "PrintScreen" || event.code === "PrintScreen" || event.keyCode === 44) return "PrintScreen";
    if (modifier && !event.shiftKey && key === "p") return "Ctrl+P (Print)";
    if (modifier && event.shiftKey && key === "s") return "Win/Ctrl+Shift+S (Snipping Tool)";
    if (event.metaKey && event.shiftKey && (key === "3" || key === "4" || key === "5")) return "Cmd+Shift+3/4/5 (Screenshot)";
    return null;
}

export function isDevToolsShortcut(event) {
    const key = String(event.key || "").toLowerCase();
    return event.key === "F12" || Boolean((event.ctrlKey || event.metaKey) && event.shiftKey && (key === "i" || key === "j" || key === "c"));
}

/** What a failed monitoring or answer request means for the exam page. */
export function classifyExamError(error) {
    const code = error?.response?.data?.code;
    if (code === "ATTEMPT_ENDED" || code === "TIME_EXPIRED") return "ENDED";
    // A token past its time gets the same way back: resuming issues a new one.
    if (code === "TOKEN_SUPERSEDED" || code === "ATTEMPT_ACTIVE_ON_ANOTHER_DEVICE" || code === "MONITORING_TOKEN_INVALID") return "SUPERSEDED";
    if (code === "IDENTITY_RECHECK_REQUIRED") return "RECHECK";
    const status = error?.response?.status;
    if (status === 401 || status === 403 || status === 404 || status === 400 || status === 413 || status === 415) return "FATAL";
    return "RETRY";
}

const ANSWER_RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 15000];

export const answerRetryDelay = (attempts) => ANSWER_RETRY_DELAYS_MS[Math.min(attempts, ANSWER_RETRY_DELAYS_MS.length - 1)];

/** What decides whether a question has something new to save: its answer, or a skip or visit. */
export const answerFingerprint = (record) => JSON.stringify([record?.answer ?? null, record?.status ?? null, Boolean(record?.hintViewed)]);

/** The questions whose saved form differs from what the server last accepted. */
export function changedQuestionIds(questionStates = {}, lastSent = {}) {
    return Object.values(questionStates)
        .filter((record) => (record.visited || record.answered || record.skipped) && answerFingerprint(record) !== lastSent[record.questionId])
        .map((record) => record.questionId);
}

/** One question's record, in the form the save route takes. */
export function toSavePayload(record, clientRevision) {
    const iso = (value) => (value ? new Date(value).toISOString() : null);
    return {
        answer: record.answered ? record.answer ?? null : null,
        clientRevision,
        state: {
            status: record.status,
            visited: Boolean(record.visited),
            skipped: Boolean(record.skipped),
            hintViewed: Boolean(record.hintViewed),
            firstVisitedAt: iso(record.firstVisitedAt),
            lastVisitedAt: iso(record.lastVisitedAt),
            answeredAt: iso(record.answeredAt),
            skippedAt: iso(record.skippedAt),
        },
    };
}

/**
 * The deadline in this browser's clock, from the server's. A wrong local clock must not
 * change how long a student has, so the difference is measured when the answer arrived.
 */
export function localDeadlineMs(deadlineAt, serverNow, receivedAtMs = Date.now()) {
    if (!deadlineAt) return null;
    const offset = serverNow ? receivedAtMs - new Date(serverNow).getTime() : 0;
    return new Date(deadlineAt).getTime() + offset;
}

/** A saved answer as words on the exam-ended view. */
export function formatSavedAnswer(answer) {
    if (answer === null || answer === undefined || answer === "") return "";
    if (Array.isArray(answer)) return answer.join(", ");
    if (typeof answer === "object") return Object.entries(answer).map(([left, right]) => `${left} → ${right}`).join(", ");
    return String(answer);
}

const REFUSALS = {
    PROCTORING_UNAVAILABLE: "Exam monitoring is unavailable right now, so this exam cannot begin. No attempt has been used. Please try again later, and contact your instructor if this continues.",
    NO_ATTEMPTS_LEFT: "You have used all the attempts allowed for this exam.",
    RETAKE_APPROVAL_REQUIRED: "This exam was ended by proctoring. Your instructor must approve a retake before you can start again.",
};

export const refusalMessage = (reason) => REFUSALS[reason] ?? null;

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
    if (key === "escape" || key === "meta" || key === "os" || key === "browserback" || key === "browserforward" || key === "f5") return true;
    if (event.altKey && (key === "tab" || key === "f4" || key === "escape" || key === "arrowleft" || key === "arrowright")) return true;
    if ((event.ctrlKey || event.metaKey) && (key === "tab" || key === "w" || key === "t" || key === "n" || key === "r")) return true;
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

/**
 * Stateful violations whose banner must remain visible while the condition is ongoing,
 * and auto-dismiss only after the condition resolves.
 */
export const CONTINUOUS_WARNING_TYPES = new Set([
    "FACE_NOT_DETECTED",
    "MULTIPLE_FACES_DETECTED",
    "HEAD_POSE_AWAY",
    "PROHIBITED_OBJECT_DETECTED",
    "IDENTITY_MISMATCH_DETECTED",
    "CAMERA_INTERRUPTED",
    "CAMERA_DENIED",
]);

export const DISCRETE_WARNING_DISMISS_MS = 10_000;
export const RESOLVED_WARNING_DISMISS_MS = 4_000;
export const MIN_WARNING_DISPLAY_MS = 6_000;

export function openWarningBanner({ message, eventType = null, currentWarnings = null, maxWarnings = null }, now = Date.now()) {
    if (!message) return null;
    const continuous = Boolean(eventType && CONTINUOUS_WARNING_TYPES.has(eventType));
    return {
        message,
        eventType,
        continuous,
        shownAt: now,
        resolvedAt: continuous ? null : now,
        dismissAt: continuous ? null : now + DISCRETE_WARNING_DISMISS_MS,
        currentWarnings,
        maxWarnings,
    };
}

export function syncWarningBannerConditions(banner, activeConditions = [], now = Date.now()) {
    if (!banner || !banner.continuous || !Array.isArray(activeConditions)) return banner;
    const stillActive = banner.eventType ? activeConditions.includes(banner.eventType) : false;
    if (stillActive) {
        if (banner.resolvedAt === null && banner.dismissAt === null) return banner;
        return { ...banner, resolvedAt: null, dismissAt: null };
    }
    if (banner.resolvedAt !== null && banner.dismissAt !== null) return banner;
    const dismissAt = Math.max(banner.shownAt + MIN_WARNING_DISPLAY_MS, now + RESOLVED_WARNING_DISMISS_MS);
    return { ...banner, resolvedAt: now, dismissAt };
}

export function shouldDismissWarningBanner(banner, now = Date.now()) {
    if (!banner) return false;
    return banner.dismissAt !== null && now >= banner.dismissAt;
}

const toEpochMs = (value) => {
    if (!value) return 0;
    const ms = typeof value === "number" ? value : Date.parse(value);
    return Number.isFinite(ms) ? ms : 0;
};

const hasAnswerValue = (answer) => {
    if (answer === undefined || answer === null || answer === "") return false;
    if (Array.isArray(answer)) return answer.length > 0;
    if (typeof answer === "object") return Object.keys(answer).length > 0;
    return true;
};

/**
 * Timestamp-aware reconciliation between sessionStorage questionStates and server-persisted
 * ProctoredAnswer rows. Newer edits win regardless of whether they came from a pre-refresh
 * local interaction or another device, and skipped/visited/hint flags are preserved.
 */
export function reconcileServerAnswers(base = {}, serverAnswers = []) {
    if (!Array.isArray(serverAnswers) || serverAnswers.length === 0) return base;
    const next = { ...base };
    for (const row of serverAnswers) {
        const qid = row?.questionId;
        if (!qid || !next[qid]) continue;
        const local = next[qid];
        const serverState = row.state && typeof row.state === "object" ? row.state : {};
        const serverSavedMs = Math.max(
            toEpochMs(row.savedAt),
            toEpochMs(serverState.answeredAt),
            toEpochMs(serverState.skippedAt),
            toEpochMs(serverState.lastVisitedAt)
        );
        const localUpdatedMs = Math.max(
            toEpochMs(local.answeredAt),
            toEpochMs(local.skippedAt),
            toEpochMs(local.lastVisitedAt)
        );
        const localUntouched = !local.visited && !local.answered && !local.skipped;
        const preferServer = localUntouched || serverSavedMs > localUpdatedMs;

        if (preferServer) {
            const answered = hasAnswerValue(row.answer);
            const skipped = Boolean(serverState.skipped || local.skipped);
            const visited = Boolean(answered || skipped || serverState.visited || local.visited);
            const hintViewed = Boolean(serverState.hintViewed || local.hintViewed);
            const status = answered ? "ANSWERED" : skipped ? "SKIPPED" : visited ? "VISITED" : "NOT_VISITED";
            next[qid] = {
                ...local,
                answer: answered ? row.answer : null,
                answered,
                skipped,
                visited,
                hintViewed,
                status,
                firstVisitedAt: toEpochMs(serverState.firstVisitedAt) || local.firstVisitedAt || (visited ? serverSavedMs || Date.now() : null),
                lastVisitedAt: toEpochMs(serverState.lastVisitedAt) || local.lastVisitedAt || (visited ? serverSavedMs || Date.now() : null),
                answeredAt: answered ? toEpochMs(serverState.answeredAt) || serverSavedMs || Date.now() : null,
                skippedAt: skipped ? toEpochMs(serverState.skippedAt) || local.skippedAt || serverSavedMs || null : null,
            };
        } else if (serverState.hintViewed && !local.hintViewed) {
            next[qid] = { ...local, hintViewed: true };
        }
    }
    return next;
}

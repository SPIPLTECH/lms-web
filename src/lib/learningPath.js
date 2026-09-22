/**
 * Reading helpers over `GET /progress/learning-path`.
 *
 * The server decides every status and every lock — this module only indexes
 * the array it returns so a deeply nested renderer can ask about one id
 * without scanning. Nothing here recomputes a decision: deriving locking in
 * the browser is what lets the sidebar disagree with what the API will
 * actually allow, which is the whole reason the endpoint exists.
 */

export const PATH_STATUS = {
    COMPLETED: "COMPLETED",
    QUALIFIED: "QUALIFIED",
    CURRENT: "CURRENT",
    AVAILABLE: "AVAILABLE",
    LOCKED: "LOCKED",
};

/** How each status reads to a student, and how it should look. */
export const PATH_STATUS_META = {
    [PATH_STATUS.COMPLETED]: { label: "Completed", tone: "emerald" },
    [PATH_STATUS.QUALIFIED]: { label: "Qualified to Skip", tone: "violet" },
    [PATH_STATUS.CURRENT]: { label: "Currently learning", tone: "primary" },
    [PATH_STATUS.AVAILABLE]: { label: "Available", tone: "sky" },
    [PATH_STATUS.LOCKED]: { label: "Locked", tone: "muted" },
};

/**
 * @param {Array} path  the `path` array from useLearningPath.
 * @returns {{ byId: Map<string, object>, entries: Array, nextItem: object|null }|null}
 *   null when the path is unavailable, so callers can render the learning
 *   experience unchanged rather than locking everything on a failed request.
 */
export function buildPathIndex(path) {
    if (!Array.isArray(path) || path.length === 0) return null;

    const byId = new Map();
    for (const entry of path) {
        if (entry?.id) byId.set(entry.id, entry);
    }

    return {
        byId,
        entries: path,
        nextItem: path.find((entry) => entry.status === PATH_STATUS.CURRENT) || null,
    };
}

/** The server's entry for one lesson/topic/module id, or null. */
export function getPathEntry(pathIndex, nodeId) {
    if (!pathIndex || !nodeId) return null;
    return pathIndex.byId.get(nodeId) || null;
}

/**
 * True only when the server has said this node is locked. An unknown node —
 * or an unavailable path — is never treated as locked: the backend refuses
 * the request anyway, and guessing here would hide content a student has
 * earned.
 */
export function isNodeLocked(pathIndex, nodeId) {
    return getPathEntry(pathIndex, nodeId)?.locked === true;
}

/** True when the student skipped this node by passing its qualifying test. */
export function isNodeQualified(pathIndex, nodeId) {
    return getPathEntry(pathIndex, nodeId)?.qualified === true;
}

/**
 * The qualifying test offered for this node, or null.
 *
 * Present only where the server says a skip is actually available — it
 * already accounts for the node being the student's current one, not already
 * finished, not locked, and the quiz having questions.
 */
export function getSkipOffer(pathIndex, nodeId) {
    const entry = getPathEntry(pathIndex, nodeId);
    if (!entry?.skippable || !entry.qualifyingQuiz) return null;
    return {
        quiz: entry.qualifyingQuiz,
        target: { kind: entry.kind, id: entry.id, title: entry.title },
    };
}

/**
 * The skip offer for wherever the student currently is, given the player's
 * active scope. Topic first, then lesson: a skip on the topic they are
 * actually reading beats one on the lesson containing it.
 */
export function getSkipOfferForScope(pathIndex, { topicId = null, lessonId = null } = {}) {
    return getSkipOffer(pathIndex, topicId) || getSkipOffer(pathIndex, lessonId);
}

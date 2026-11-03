/**
 * The exam page's address shows the course, as the learn page does, and no ids. Which exam it is
 * stays with this browser tab, so a refresh still works. This tidies the address and protects
 * nothing: the server decides who may open what.
 */
const STORAGE_KEY = "proctored-exam-target";
const BASE = "/student/proctored";
const PLAIN = "exam";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CUID = /^c[a-z0-9]{20,}$/;

export const isOpaqueId = (segment) => UUID.test(segment) || CUID.test(segment);

/** The address for an exam reached from a course page. */
export function examAddressFor(returnTo) {
    const slug = /^\/student\/learn\/([^/?#]+)/.exec(returnTo || "")?.[1];
    return `${BASE}/${slug && !isOpaqueId(slug) ? slug : PLAIN}`;
}

const remember = (storage, target) => {
    try {
        storage.setItem(STORAGE_KEY, JSON.stringify(target));
        return true;
    } catch {
        return false;
    }
};

const recall = (storage) => {
    try {
        return JSON.parse(storage.getItem(STORAGE_KEY)) || null;
    } catch {
        return null;
    }
};

/**
 * Goes to the exam. A full page load on purpose: only that page gets camera permission, and the
 * browser keeps the policy of the page it first loaded, so client-side navigation would not get it.
 */
export function openProctoredExam({ quizId, returnTo = null }, { storage = window.sessionStorage, go = (url) => window.location.assign(url) } = {}) {
    if (remember(storage, { quizId, returnTo })) {
        go(examAddressFor(returnTo));
        return;
    }
    go(`${BASE}/${quizId}${returnTo ? `?from=${encodeURIComponent(returnTo)}` : ""}`);
}

/**
 * Works out which exam this address means. Gives { quizId, returnTo, address }, where address is
 * what the bar should show, or { fallback } when no exam is known and the student should go there.
 */
export function resolveExamTarget({ segment, from, storage }) {
    if (isOpaqueId(segment)) {
        // An old link. It still opens, and its address is tidied if this tab can remember the exam.
        const kept = remember(storage, { quizId: segment, returnTo: from });
        return { quizId: segment, returnTo: from, address: kept ? examAddressFor(from) : null };
    }
    const target = recall(storage);
    if (target?.quizId) return { quizId: target.quizId, returnTo: target.returnTo ?? null, address: examAddressFor(target.returnTo) };
    return { fallback: segment === PLAIN ? "/student/my-courses" : `/student/learn/${segment}` };
}

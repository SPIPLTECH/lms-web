import { slugifyTitle } from "../courseSlug.js";
import { isOpaqueId } from "./examAddress.js";

/**
 * A review's address shows the quiz, and neither an id nor a student's name. Which attempt it is
 * stays with this browser tab, so a refresh still works. This tidies the address and protects
 * nothing: the server decides who may see what.
 */
const STORAGE_KEY = "proctoring-review-target";
const PLAIN = "review";

export const reviewAddressFor = (listPath, quizTitle) => `${listPath}/${slugifyTitle(quizTitle) || PLAIN}`;

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

/** Opens a review from the list. */
export function openProctoringReview({ attemptId, quizTitle, listPath }, { storage = window.sessionStorage, go }) {
    const address = reviewAddressFor(listPath, quizTitle);
    go(remember(storage, { attemptId, address }) ? address : `${listPath}/${attemptId}`);
}

/**
 * Works out which attempt this address means. Gives { attemptId, address }, where address is what
 * the bar should show, or { fallback } when none is known and the reviewer should go back to the list.
 */
export function resolveReviewTarget({ segment, listPath, storage }) {
    if (isOpaqueId(segment)) {
        // A link holding an id, such as a notification. It opens, and is tidied if this tab can remember it.
        const address = reviewAddressFor(listPath, null);
        return { attemptId: segment, address: remember(storage, { attemptId: segment, address }) ? address : null };
    }
    const target = recall(storage);
    if (target?.attemptId && target.address === `${listPath}/${segment}`) return { attemptId: target.attemptId, address: target.address };
    return { fallback: listPath };
}

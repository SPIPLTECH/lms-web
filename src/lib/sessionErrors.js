/**
 * The API's stable error codes for sign-in, sessions and playback, and the
 * message each one shows. The backend sends a `code` (also inside
 * `error.code`); the UI branches on it, never on message text.
 */

export const SESSION_ERROR_CODES = {
  SESSION_ALREADY_ACTIVE: "SESSION_ALREADY_ACTIVE",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  SESSION_INVALID: "SESSION_INVALID",
  ACCESS_TOKEN_EXPIRED: "ACCESS_TOKEN_EXPIRED",
  AUTH_REQUIRED: "AUTH_REQUIRED",
  ACCOUNT_SUSPENDED: "ACCOUNT_SUSPENDED",
  ACCOUNT_NOT_ALLOWED: "ACCOUNT_NOT_ALLOWED",
  GOOGLE_TOKEN_INVALID: "GOOGLE_TOKEN_INVALID",
  GOOGLE_AUTH_NOT_CONFIGURED: "GOOGLE_AUTH_NOT_CONFIGURED",
  PLAYBACK_ACTIVE_ON_ANOTHER_DEVICE: "PLAYBACK_ACTIVE_ON_ANOTHER_DEVICE",
  CONTENT_ACTIVE_ON_ANOTHER_DEVICE: "CONTENT_ACTIVE_ON_ANOTHER_DEVICE",
  PLAYBACK_LEASE_LOST: "PLAYBACK_LEASE_LOST",
  CONTENT_ACCESS_DENIED: "CONTENT_ACCESS_DENIED",
  LOGOUT_FAILED: "LOGOUT_FAILED",
  // Client-side reason: this browser was signed out in another tab.
  SIGNED_OUT: "SIGNED_OUT",
};

// Technical specification §11 "Suggested user-facing messages", plus the
// codes this project adds.
const MESSAGES = {
  // Every role may sign in on several devices; this code now only means a
  // simultaneous second sign-in from the same browser.
  SESSION_ALREADY_ACTIVE: "This browser is already signing in. Please wait a moment and try again.",
  PLAYBACK_ACTIVE_ON_ANOTHER_DEVICE:
    "This account is already watching on another device. Stop playback on that device to continue watching here.",
  CONTENT_ACTIVE_ON_ANOTHER_DEVICE:
    "This account is currently active on another device. Stop playback on that device to access course content here.",
  PLAYBACK_LEASE_LOST: "Playback permission expired. Pause and try again.",
  SESSION_EXPIRED: "Your session expired. Please sign in again.",
  SESSION_INVALID: "Your session is no longer valid. Please sign in again.",
  ACCOUNT_SUSPENDED: "Your account has been suspended. Please contact support.",
  ACCOUNT_NOT_ALLOWED: "No Orange Tree LMS account is linked to this Google account.",
  GOOGLE_TOKEN_INVALID: "Google sign-in could not be verified. Please try again.",
  GOOGLE_AUTH_NOT_CONFIGURED: "Google sign-in is not available right now.",
  CONTENT_ACCESS_DENIED: "You do not have access to this content.",
  LOGOUT_FAILED: "We couldn't sign you out because the server didn't respond. Check your connection and try again.",
  SIGNED_OUT: "You were signed out in another tab. Please sign in again.",
};

/** The stable code on an axios error (or a response body), if any. */
export function getErrorCode(errorOrBody) {
  const body = errorOrBody?.response?.data ?? errorOrBody;
  const code = body?.error?.code ?? body?.code;
  return typeof code === "string" ? code : null;
}

/** The message for a code, or `fallback`. */
export function messageForCode(code, fallback = null) {
  return (code && MESSAGES[code]) || fallback;
}

// Sign-in refusals whose message is shown. Anything else from the password
// form keeps the login page's generic "Invalid email or password."
const SIGN_IN_CODES_WITH_MESSAGES = new Set([
  "SESSION_ALREADY_ACTIVE",
  "ACCOUNT_SUSPENDED",
  "ACCOUNT_NOT_ALLOWED",
  "GOOGLE_TOKEN_INVALID",
  "GOOGLE_AUTH_NOT_CONFIGURED",
]);

/**
 * What the login page shows for a refused sign-in. The server's own message
 * wins — it knows the case (e.g. a same-browser race vs. a server whose
 * multi-device update is not finished) — then this file's text for the code,
 * then `fallback`.
 */
export function signInErrorMessage(error, fallback) {
  const code = getErrorCode(error);
  if (!SIGN_IN_CODES_WITH_MESSAGES.has(code)) return fallback;
  const body = error?.response?.data ?? error;
  const serverMessage = body?.error?.message ?? body?.message;
  return (typeof serverMessage === "string" && serverMessage.trim()) || messageForCode(code, fallback);
}

/**
 * The session itself is gone (logged out elsewhere, expired, revoked, account
 * suspended). Refreshing cannot revive it; the client must sign in again.
 */
export function isDeadSessionCode(code) {
  return (
    code === SESSION_ERROR_CODES.SESSION_EXPIRED ||
    code === SESSION_ERROR_CODES.SESSION_INVALID ||
    code === SESSION_ERROR_CODES.ACCOUNT_SUSPENDED
  );
}

/**
 * A 401 worth one refresh attempt: an expired access token, or no access
 * token at all (AUTH_REQUIRED — e.g. its cookie expired, or another tab
 * signed out and cleared it). If there is no refresh credential either, the
 * refresh attempt fails and the client is signed out cleanly. "Token
 * expired" is the same response from an API build that predates the codes.
 */
export function isRefreshable(errorOrBody) {
  const body = errorOrBody?.response?.data ?? errorOrBody;
  const code = getErrorCode(body);
  if (code) {
    return code === SESSION_ERROR_CODES.ACCESS_TOKEN_EXPIRED || code === SESSION_ERROR_CODES.AUTH_REQUIRED;
  }
  return body?.message === "Token expired";
}

/**
 * The server answered and refused the credentials (401/403). Only this
 * proves the session is unusable; anything else might be a passing failure.
 */
export function isConfirmedAuthRejection(error) {
  const status = error?.response?.status;
  return status === 401 || status === 403;
}

/**
 * No answer, or an answer that says "try later": a timeout, a network
 * failure, a 5xx, 408 or 429. The session may well still be valid, so local
 * credentials must not be thrown away because of it.
 */
export function isTransientFailure(error) {
  const status = error?.response?.status;
  if (!status) return true;
  return status >= 500 || status === 408 || status === 429;
}

/**
 * What the axios response interceptor does with a failed API request:
 *  - `{ type: "end", reason }`  the session is over: clear it, sign in again
 *  - `{ type: "refresh" }`      one refresh attempt, then retry the request
 *  - `{ type: "none" }`         that request's own error (incl. no answer)
 *
 * A 401 with no refresh credential left is reported as SESSION_EXPIRED, not
 * SIGNED_OUT: it also happens when the credential expired or was cleared, or
 * during this tab's own logout. "Signed out in another tab" is said only for
 * the real cross-tab event (AuthContext).
 */
export function interceptorAction(error, { isAuthRoute = false, alreadyRetried = false, hasRefreshToken = false } = {}) {
  if (!error?.response || isAuthRoute) return { type: "none" };
  const code = getErrorCode(error);
  if (isDeadSessionCode(code)) return { type: "end", reason: code };
  if (error.response.status === 401 && isRefreshable(error) && !alreadyRetried) {
    return hasRefreshToken ? { type: "refresh" } : { type: "end", reason: SESSION_ERROR_CODES.SESSION_EXPIRED };
  }
  return { type: "none" };
}

/**
 * The reason to end the session after the refresh call itself failed, or
 * null when it was a passing failure (no answer, 5xx, 408, 429) that says
 * nothing about the session — the credentials are then kept.
 */
export function refreshFailureReason(refreshError) {
  if (isTransientFailure(refreshError)) return null;
  return getErrorCode(refreshError) || SESSION_ERROR_CODES.SESSION_EXPIRED;
}

/**
 * STUDENT content-access rule: the API refused course content (or playback)
 * because another device of this account holds the playback lease. Not a
 * session problem — the student stays signed in.
 */
export function isContentBlockedError(error) {
  const code = getErrorCode(error);
  return (
    code === SESSION_ERROR_CODES.CONTENT_ACTIVE_ON_ANOTHER_DEVICE ||
    code === SESSION_ERROR_CODES.PLAYBACK_ACTIVE_ON_ANOTHER_DEVICE
  );
}

/**
 * From GET /playback/status: another device of this account is playing, so
 * this one may not show course content. Roles without a lease (staff) and an
 * unknown status are never blocked here — the API still enforces the rule.
 */
export function isPlaybackHeldElsewhere(status) {
  return Boolean(status) && status.leaseRequired !== false && status.active === true && status.heldByThisDevice === false;
}

// Student pages that show course content (the learning workspace, a course,
// assignments, quizzes, attempts, results, notes, bookmarks, QA, and reports).
// Non-course-content pages (dashboard, my-courses list, profile, settings) stay available.
const COURSE_CONTENT_PATH = /^\/student\/(?:learn\b|courses\/[^/]+|assignments\b|quizzes\b|attempt\b|result\b|notes\b|bookmarks\b|qa\b|reports\b)/;

/** Whether a student page path shows course content (and so follows the lease rule). */
export function isCourseContentPath(pathname) {
  return typeof pathname === "string" && COURSE_CONTENT_PATH.test(pathname);
}

/**
 * The login page's `?reason=CODE`, read once: the message to show (null for
 * no or an unknown code) and the same URL without `reason`, to put back with
 * history.replaceState so a reload or Back does not show it again.
 */
export function consumeLoginReason(href) {
  const url = new URL(href, "http://localhost");
  const reason = url.searchParams.get("reason");
  url.searchParams.delete("reason");
  const cleaned = `${url.pathname}${url.search}${url.hash}`;
  return { message: reason ? messageForCode(reason) : null, url: cleaned, changed: reason !== null };
}

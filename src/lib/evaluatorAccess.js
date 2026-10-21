/**
 * Evaluator (temporary testing) accounts — the client-side mirror of the
 * backend's utils/evaluatorAccess.js. Full access for 2 days from
 * registration; after that learning access ends and, if it hasn't been given
 * yet, the evaluator is asked for the external feedback. The backend is
 * authoritative (it refuses every learning API once EXPIRED); this copy only
 * decides which screen to show, and flips at the deadline without waiting for
 * the next request to be refused.
 *
 * `evaluator` is the `evaluator` object on the session profile (null for
 * everyone who is not an evaluator).
 */

export const EVALUATOR_STATES = {
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
};

export const EVALUATOR_BLOCK_CODES = ["EVALUATOR_ACCESS_EXPIRED"];

export const EVALUATOR_ACCESS_PATH = "/evaluator/access";

export const EVALUATOR_MESSAGES = {
  feedbackRecorded:
    "Thank you for participating in the Orange Tree LMS evaluation. This testing account is available for only 2 days from registration. Your feedback has been recorded.",
  expired:
    "Your Orange Tree LMS testing period has ended. Evaluator access is available for only 2 days from registration. Thank you for helping us evaluate the platform.",
  expiredWithFeedback:
    "Thank you for participating in the Orange Tree LMS evaluation. Your feedback has been recorded, and your 2-day testing period has ended.",
};

export const evaluatorStateAt = (evaluator, now) => {
  if (!evaluator?.expiresAt) return null;
  return now >= new Date(evaluator.expiresAt).getTime() ? EVALUATOR_STATES.EXPIRED : EVALUATOR_STATES.ACTIVE;
};

export const formatEvaluatorDeadline = (value) =>
  value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "";

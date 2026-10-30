/**
 * Assignment auto-evaluation, as the instructor sees it: what each status
 * means, when to keep polling, and which review actions are open. Pure (no
 * React or network) so it is unit-tested in src/lib/__tests__.
 *
 * Statuses come from the API (assignmentEvaluation.service evaluationStatus):
 * an automated result is only ever a proposal; the student sees marks once an
 * instructor approves or sets them ("published").
 */

const EVALUATION_STATUS = {
  pending: {
    label: "Not evaluated yet",
    tone: "muted",
    description: "The evaluator has not run for this submission yet.",
  },
  evaluating: {
    label: "Evaluating…",
    tone: "muted",
    description: "The evaluator is reading this submission. This page updates when it is done.",
  },
  ready: {
    label: "Awaiting approval",
    tone: "info",
    description: "Marks suggested. The student sees nothing until you approve or change them.",
  },
  "needs-review": {
    label: "Needs review",
    tone: "warn",
    description: "The evaluator is unsure. Check it before you approve or set marks.",
  },
  outdated: {
    label: "Scheme changed",
    tone: "warn",
    description: "Suggested with an older marking scheme. Re-evaluate before approving.",
  },
  failed: {
    label: "Evaluation failed",
    tone: "bad",
    description: "Mark this submission yourself, or re-evaluate it.",
  },
  published: {
    label: "Published",
    tone: "ok",
    description: "Approved by an instructor and shown to the student.",
  },
  "graded-by-hand": {
    label: "Graded by hand",
    tone: "ok",
    description: "A grade typed by hand is shown to the student instead of the evaluation.",
  },
};

export function evaluationStatusMeta(status) {
  return EVALUATION_STATUS[status] || { label: status || "—", tone: "muted", description: "" };
}

export const EVALUATION_POLL_MS = 3000;
export const SUBMISSIONS_POLL_MS = 5000;

export const isEvaluationRunning = (status) => status === "evaluating";

/** React Query refetchInterval for one submission's evaluation: only while it runs. */
export function evaluationPollInterval(evaluation) {
  return isEvaluationRunning(evaluation?.status) ? EVALUATION_POLL_MS : false;
}

/** React Query refetchInterval for the submissions table: only while a row is being evaluated. */
export function submissionsPollInterval(data) {
  const rows = Array.isArray(data?.submissions) ? data.submissions : [];
  return rows.some((s) => isEvaluationRunning(s?.evaluation?.status)) ? SUBMISSIONS_POLL_MS : false;
}

/**
 * What the review panel offers for one evaluation (GET …/evaluation).
 * `expectedVersion` goes with every decision so the server can refuse one
 * made on an out-of-date view.
 */
export function reviewActions(evaluation) {
  const status = evaluation?.status ?? null;
  const current = evaluation?.current ?? null;
  const running = isEvaluationRunning(status);
  const proposal = Boolean(current) && current.source === "AUTO";
  const failed = Boolean(current?.result?.failed);
  const canApprove = !running && proposal && !failed && (status === "ready" || status === "needs-review");

  let approveBlockedReason = null;
  if (proposal && !canApprove) {
    if (running) approveBlockedReason = "Being evaluated. Wait for the result.";
    else if (failed) approveBlockedReason = "Automatic evaluation failed. Set the marks yourself or re-evaluate.";
    else if (status === "outdated") approveBlockedReason = "The marking scheme changed after this suggestion. Re-evaluate before approving.";
    else if (status === "graded-by-hand") approveBlockedReason = "This submission was graded by hand after the suggestion was made.";
  }

  return {
    canApprove,
    approveBlockedReason,
    canOverride: !running && Number(evaluation?.assignmentMarks) > 0,
    canReEvaluate: !running,
    // A graded submission is only re-marked when the instructor reopens it.
    reEvaluateNeedsReopen: !running && Boolean(evaluation?.grade),
    expectedVersion: current ? current.version : null,
  };
}

/** The message to show for a refused decision (409 codes from the API). */
export function decisionErrorMessage(error, fallback) {
  const data = error?.response?.data;
  if (data?.code === "VERSION_CONFLICT") {
    return "This evaluation changed after you opened it (another decision or a new result). It has been reloaded; check it and decide again.";
  }
  return data?.message || fallback;
}

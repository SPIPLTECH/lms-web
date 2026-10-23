import {
  EVALUATION_POLL_MS,
  SUBMISSIONS_POLL_MS,
  decisionErrorMessage,
  evaluationPollInterval,
  evaluationStatusMeta,
  reviewActions,
  submissionsPollInterval,
} from "../assignmentEvaluationState.js";

const proposal = (overrides = {}) => ({ version: 3, source: "AUTO", result: { criteria: [] }, ...overrides });
const evaluation = (overrides = {}) => ({ status: "ready", grade: null, assignmentMarks: 4, current: proposal(), ...overrides });

function runTests() {
  const testCases = [
    {
      name: "polls one evaluation only while it is being evaluated",
      check: () =>
        evaluationPollInterval({ status: "evaluating" }) === EVALUATION_POLL_MS &&
        ["ready", "needs-review", "published", "failed", "pending"].every((status) => evaluationPollInterval({ status }) === false) &&
        evaluationPollInterval(undefined) === false,
    },
    {
      name: "polls the submissions table only while a row is being evaluated",
      check: () =>
        submissionsPollInterval({ submissions: [{ evaluation: { status: "ready" } }, { evaluation: { status: "evaluating" } }] }) === SUBMISSIONS_POLL_MS &&
        submissionsPollInterval({ submissions: [{ evaluation: null }, { evaluation: { status: "published" } }] }) === false &&
        submissionsPollInterval(undefined) === false,
    },
    {
      name: "a ready or flagged proposal can be approved, with the version that was shown",
      check: () => {
        const ready = reviewActions(evaluation());
        const flagged = reviewActions(evaluation({ status: "needs-review" }));
        return ready.canApprove && flagged.canApprove && ready.expectedVersion === 3 && ready.approveBlockedReason === null;
      },
    },
    {
      name: "nothing can be decided while the evaluator runs",
      check: () => {
        const a = reviewActions(evaluation({ status: "evaluating" }));
        return !a.canApprove && !a.canOverride && !a.canReEvaluate && /Being evaluated/.test(a.approveBlockedReason);
      },
    },
    {
      name: "failed and outdated proposals cannot be approved, and say why",
      check: () => {
        const failed = reviewActions(evaluation({ status: "failed", current: proposal({ result: { failed: true } }) }));
        const outdated = reviewActions(evaluation({ status: "outdated" }));
        return !failed.canApprove && /failed/.test(failed.approveBlockedReason) && failed.canOverride &&
          !outdated.canApprove && /marking scheme changed/.test(outdated.approveBlockedReason);
      },
    },
    {
      name: "a published decision is not approved again; re-evaluating it needs an explicit reopen",
      check: () => {
        const a = reviewActions(evaluation({ status: "published", grade: "4/4", current: proposal({ source: "INSTRUCTOR" }) }));
        return !a.canApprove && a.canOverride && a.reEvaluateNeedsReopen;
      },
    },
    {
      name: "an ungraded submission is re-evaluated without reopening",
      check: () => reviewActions(evaluation()).reEvaluateNeedsReopen === false,
    },
    {
      name: "marks cannot be set before the assignment has marks; a missing evaluation sends version null",
      check: () => {
        const none = reviewActions({ status: "pending", grade: null, assignmentMarks: null, current: null });
        const notYet = reviewActions({ status: "pending", grade: null, assignmentMarks: 4, current: null });
        return !none.canOverride && notYet.canOverride && notYet.expectedVersion === null && !notYet.canApprove;
      },
    },
    {
      name: "every API status has a label; unknown ones fall back without crashing",
      check: () =>
        ["pending", "evaluating", "ready", "needs-review", "outdated", "failed", "published", "graded-by-hand"].every(
          (s) => evaluationStatusMeta(s).label && evaluationStatusMeta(s).description
        ) && evaluationStatusMeta("something-new").label === "something-new",
    },
    {
      name: "a refused decision explains a version conflict; other errors show the server message",
      check: () =>
        /changed after you opened it/.test(decisionErrorMessage({ response: { data: { code: "VERSION_CONFLICT", message: "x" } } }, "f")) &&
        decisionErrorMessage({ response: { data: { code: "FINALIZED", message: "Already graded." } } }, "f") === "Already graded." &&
        decisionErrorMessage(new Error("network"), "Fallback") === "Fallback",
    },
  ];

  let passed = 0;
  let failed = 0;
  testCases.forEach((tc) => {
    let ok = false;
    try {
      ok = tc.check() === true;
    } catch (error) {
      console.error(error);
    }
    if (ok) {
      console.log(`[PASS] ${tc.name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${tc.name}`);
      failed++;
    }
  });

  console.log(`\nRESULTS: ${passed} Passed, ${failed} Failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

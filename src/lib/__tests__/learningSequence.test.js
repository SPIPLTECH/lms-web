/**
 * After a visit is recorded, the player marks the visited steps in its cached
 * learning sequence instead of refetching it (useMarkVisited). These pin what
 * that local edit may and may not change.
 *
 * Same for a completion (useCompleteContent): the step is marked completed in
 * the cache as soon as the server confirms, so "Mark as Complete" does not
 * come back while the sequence is refetched for its locks.
 */
import { markQuizStepAttempted, markStepsCompleted, markStepsVisited } from "../learningSequence.js";

const AT = "2026-10-24T10:00:00.000Z";
const step = (contentId, extra = {}) => ({ contentId, contentIds: [contentId], visited: false, visitedAt: null, locked: false, completed: false, ...extra });

function runTests() {
  const testCases = [
    {
      name: "the visited step is marked visited with the given timestamp",
      run: () => {
        const seq = { steps: [step("a"), step("b")] };
        const out = markStepsVisited(seq, ["a"], AT);
        return out.steps[0].visited === true && out.steps[0].visitedAt === AT && out.steps[1].visited === false;
      },
    },
    {
      name: "nothing else moves: locks, completion and other fields are untouched",
      run: () => {
        const seq = { courseId: "c1", resumeIndex: 0, steps: [step("a"), step("b", { locked: true, blockedByIndex: 0 })] };
        const out = markStepsVisited(seq, ["a"], AT);
        return out.steps[1].locked === true && out.steps[1].blockedByIndex === 0 && out.steps[0].completed === false && out.resumeIndex === 0 && out.courseId === "c1";
      },
    },
    {
      name: "a merged step is visited only once every one of its parts is",
      run: () => {
        const merged = { steps: [{ ...step("a"), contentIds: ["a", "a2"] }] };
        return markStepsVisited(merged, ["a"], AT) === merged && markStepsVisited(merged, ["a", "a2"], AT).steps[0].visited === true;
      },
    },
    {
      name: "an already-visited step keeps its first visit time",
      run: () => {
        const seq = { steps: [step("a", { visited: true, visitedAt: "2026-10-01T00:00:00.000Z" })] };
        return markStepsVisited(seq, ["a"], AT) === seq;
      },
    },
    {
      name: "the input is never mutated and an untouched sequence keeps its reference",
      run: () => {
        const seq = { steps: [step("a")] };
        const snapshot = JSON.stringify(seq);
        const out = markStepsVisited(seq, ["a"], AT);
        return JSON.stringify(seq) === snapshot && out !== seq && markStepsVisited(seq, ["zzz"], AT) === seq;
      },
    },
    {
      name: "missing data is passed through (no cache yet, no ids)",
      run: () => markStepsVisited(undefined, ["a"], AT) === undefined && markStepsVisited({ steps: [step("a")] }, [], AT).steps[0].visited === false,
    },
    {
      name: "completion: the completed step reads completed at once, others untouched",
      run: () => {
        const seq = { steps: [step("a"), step("b")] };
        const out = markStepsCompleted(seq, ["a"], true);
        return out.steps[0].completed === true && out.steps[1].completed === false;
      },
    },
    {
      name: "completion: locks are left to the server's refetch",
      run: () => {
        const seq = { steps: [step("a"), step("b", { locked: true, blockedByIndex: 0 })] };
        const out = markStepsCompleted(seq, ["a"], true);
        return out.steps[1].locked === true && out.steps[1].blockedByIndex === 0 && out.steps[0].visited === false;
      },
    },
    {
      name: "completion: a merged step is completed only once every one of its parts is",
      run: () => {
        const merged = { steps: [{ ...step("a"), contentIds: ["a", "a2"] }] };
        return markStepsCompleted(merged, ["a"], true) === merged && markStepsCompleted(merged, ["a", "a2"], true).steps[0].completed === true;
      },
    },
    {
      name: "completion: marking incomplete clears the flag",
      run: () => {
        const seq = { steps: [step("a", { completed: true })] };
        return markStepsCompleted(seq, ["a"], false).steps[0].completed === false;
      },
    },
    {
      name: "completion: no change keeps the reference, input never mutated",
      run: () => {
        const seq = { steps: [step("a", { completed: true }), step("b")] };
        const snapshot = JSON.stringify(seq);
        const same = markStepsCompleted(seq, ["a"], true);
        markStepsCompleted(seq, ["b"], true);
        return same === seq && JSON.stringify(seq) === snapshot && markStepsCompleted(undefined, ["a"], true) === undefined;
      },
    },
    {
      name: "quiz submitted: its step reads attempted at once; completion and locks wait for the server",
      run: () => {
        const seq = { steps: [step("a"), step("q", { kind: "QUIZ", quizId: "quiz-1" }), step("b", { locked: true, blockedByIndex: 1 })] };
        const out = markQuizStepAttempted(seq, "quiz-1");
        return out.steps[1].attempted === true && out.steps[1].completed === false && out.steps[2].locked === true && out.steps[0] === seq.steps[0];
      },
    },
    {
      name: "quiz submitted: unknown quiz, already attempted or no cache keeps the reference",
      run: () => {
        const seq = { steps: [step("q", { kind: "QUIZ", quizId: "quiz-1", attempted: true })] };
        const snapshot = JSON.stringify(seq);
        return markQuizStepAttempted(seq, "quiz-1") === seq && markQuizStepAttempted(seq, "other") === seq &&
          markQuizStepAttempted(undefined, "quiz-1") === undefined && markQuizStepAttempted(seq, null) === seq && JSON.stringify(seq) === snapshot;
      },
    },
  ];

  let passed = 0;
  let failed = 0;
  testCases.forEach((tc) => {
    let ok = false;
    try {
      ok = tc.run() === true;
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

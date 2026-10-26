/**
 * After a visit is recorded, the player marks the visited steps in its cached
 * learning sequence instead of refetching it (useMarkVisited). These pin what
 * that local edit may and may not change.
 */
import { markStepsVisited } from "../learningSequence.js";

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

import {
  buildProgressIndex,
  decorateCourseWithProgress,
  getNodeProgress,
  isItemComplete,
  isNodeLeavable,
} from "../progressIndex.js";
import { normalizeCourseHierarchy } from "../courseMapper.js";
import { buildOldCourse, buildNewCourse, buildMixedCourse, toProgressHierarchy } from "./hierarchyFixtures.js";

/**
 * The index reads the backend roll-up as-is — these cases only check that
 * SubTopic/Concept nodes and items are reachable through it, that a node's
 * leavability accounts for every descendant item, and that no progress value
 * is recomputed on the way through.
 */

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const done = { visited: true, completed: true };
const attempted = { visited: true, attempted: true };

function runTests() {
  const cases = [];
  const old = normalizeCourseHierarchy(buildOldCourse());
  const neu = normalizeCourseHierarchy(buildNewCourse());
  const mixed = normalizeCourseHierarchy(buildMixedCourse());

  cases.push({
    name: "OLD: Topic leavability is unchanged (own items only)",
    run: () => {
      const incomplete = buildProgressIndex(toProgressHierarchy(old, { t1c1: done }));
      const complete = buildProgressIndex(toProgressHierarchy(old, { t1c1: done, t1c2: done, t1q1: attempted }));
      return [isNodeLeavable(incomplete, "t1"), isNodeLeavable(complete, "t1")];
    },
    expected: [false, true],
  });

  cases.push({
    name: "NEW: SubTopic and Concept nodes are indexed with the backend's own numbers",
    run: () => {
      const index = buildProgressIndex(
        toProgressHierarchy(neu, {}, {
          st1: { progressPercent: 50, completedItems: 1, totalItems: 2 },
          c1: { progressPercent: 100, completed: true, completedItems: 2, totalItems: 2 },
        })
      );
      const st1 = getNodeProgress(index, "st1");
      const c1 = getNodeProgress(index, "c1");
      return [st1.progressPercent, st1.completedItems, st1.totalItems, c1.progressPercent, c1.completed];
    },
    expected: [50, 1, 2, 100, true],
  });

  cases.push({
    name: "NEW: a Topic with only SubTopics is not permanently stuck once its items are done",
    run: () => {
      // The backend still reports the Topic incomplete here; the gate must
      // judge by the (now reachable) descendant items, not strand the student.
      const allDone = { k1c1: done, k1q1: attempted, k1a1: done, k2c1: done, s2c1: done, s2q1: attempted, s2a1: done };
      const index = buildProgressIndex(toProgressHierarchy(neu, allDone, { t1: { completed: false } }));
      return isNodeLeavable(index, "t1");
    },
    expected: true,
  });

  cases.push({
    name: "NEW: a Topic with only SubTopics stays gated while a Concept item is incomplete",
    run: () => {
      // c2's only item (k2c1) is still open; every other item is finished.
      const index = buildProgressIndex(
        toProgressHierarchy(neu, { k1c1: done, k1q1: attempted, k1a1: done, s2c1: done, s2q1: attempted, s2a1: done })
      );
      return [isNodeLeavable(index, "t1"), isNodeLeavable(index, "st1"), isNodeLeavable(index, "c1"), isNodeLeavable(index, "c2")];
    },
    expected: [false, false, true, false],
  });

  cases.push({
    name: "MIXED: Topic direct items done but SubTopic item open — Topic is not falsely complete",
    run: () => {
      const index = buildProgressIndex(toProgressHierarchy(mixed, { t1c1: done, t1q1: attempted }));
      return [isNodeLeavable(index, "t1"), isNodeLeavable(index, "st1"), isNodeLeavable(index, "cp1")];
    },
    expected: [false, false, false],
  });

  cases.push({
    name: "MIXED: every descendant done — Topic, SubTopic and Concept all leavable",
    run: () => {
      const index = buildProgressIndex(
        toProgressHierarchy(mixed, { t1c1: done, t1q1: attempted, s1c1: done, s1q1: attempted, cp1c1: done, cp1q1: attempted })
      );
      return [isNodeLeavable(index, "t1"), isNodeLeavable(index, "st1"), isNodeLeavable(index, "cp1")];
    },
    expected: [true, true, true],
  });

  cases.push({
    name: "isItemComplete reads Concept-level items",
    run: () => {
      const index = buildProgressIndex(toProgressHierarchy(mixed, { cp1c1: done }));
      return [isItemComplete(index, "cp1c1"), isItemComplete(index, "s1c1")];
    },
    expected: [true, false],
  });

  cases.push({
    name: "decorateCourseWithProgress carries flags down to SubTopics, Concepts and their assignments",
    run: () => {
      const index = buildProgressIndex(
        toProgressHierarchy(neu, { k1a1: { completed: true }, s2a1: { completed: false } }, {
          st2: { progressPercent: 40, completed: false, totalItems: 2 },
          c1: { progressPercent: 100, completed: true, totalItems: 3 },
        })
      );
      const t1 = decorateCourseWithProgress(neu, index).modules[0].lessons[0].topics[0];
      const [st1, st2] = t1.subTopics;
      return {
        st2: [st2.progressPercent, st2.completed, st2.assignments[0].completed],
        c1: [st1.concepts[0].progressPercent, st1.concepts[0].completed, st1.concepts[0].assignments[0].completed],
      };
    },
    expected: { st2: [40, false, false], c1: [100, true, true] },
  });

  cases.push({
    name: "OLD: decorated Topics gain an empty subTopics list and nothing else changes",
    run: () => {
      const index = buildProgressIndex(toProgressHierarchy(old, { t1c1: done }, { t1: { progressPercent: 33 } }));
      const t1 = decorateCourseWithProgress(old, index).modules[0].lessons[0].topics[0];
      return [t1.subTopics, t1.progressPercent, t1.contents[0].completed, t1.contents[1].completed];
    },
    expected: [[], 33, true, false],
  });

  let passed = 0;
  let failed = 0;
  console.log("=== RUNNING PROGRESS INDEX TESTS ===");
  for (const tc of cases) {
    const actual = tc.run();
    if (same(actual, tc.expected)) {
      console.log(`[PASS] ${tc.name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${tc.name}`);
      console.error("  Expected:", JSON.stringify(tc.expected));
      console.error("  Actual:  ", JSON.stringify(actual));
      failed++;
    }
  }
  console.log(`\nRESULTS: ${passed} Passed, ${failed} Failed`);
  if (failed > 0) process.exit(1);
}

runTests();

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { resolveResumeTarget } from "../resumeTarget.js";
import { buildCourseUnits } from "../courseUnits.js";
import { normalizeCourseHierarchy } from "../courseMapper.js";
import {
  buildOldCourse,
  buildNewCourse,
  buildMixedCourse,
  buildCourseLevelCourse,
  flattenUnitItemIds,
  toProgressHierarchy,
} from "./hierarchyFixtures.js";

const ccatStudentRollup = JSON.parse(
  readFileSync(fileURLToPath(new URL("./fixtures/ccatStudentRollup.json", import.meta.url)), "utf8")
);

/**
 * resolveResumeTarget must walk leaves in the SAME order the player itself
 * uses (courseUnits.js: a level's own content/quizzes interleaved with its
 * children by `order`, not "own content always first"). These cases
 * construct hierarchies where the old "content before children" rule and the
 * real order-interleaved rule disagree, so a wrong implementation resolves
 * to a different (wrong) leaf id than the correct one.
 */

function runTests() {
  const testCases = [];

  testCases.push({
    name: "a lesson ordered before its module's own content is visited first",
    input: {
      hierarchy: {
        contents: [],
        quizzes: [],
        modules: [
          {
            id: "m1",
            order: 1,
            contents: [{ id: "modcontent1", order: 2, visited: true, completed: false }],
            quizzes: [],
            lessons: [
              {
                id: "l1",
                order: 1,
                contents: [{ id: "lessoncontent1", order: 1, visited: true, completed: true }],
                quizzes: [],
                topics: [],
              },
            ],
          },
        ],
      },
    },
    // lessoncontent1 (order 1) comes before modcontent1 (order 2) in real
    // course order, so the last-visited-and-incomplete leaf is modcontent1.
    expected: { id: "modcontent1" },
  });

  testCases.push({
    name: "a topic's own quiz is part of the resume sequence",
    input: {
      hierarchy: {
        contents: [],
        quizzes: [],
        modules: [
          {
            id: "m1",
            order: 1,
            contents: [],
            quizzes: [],
            lessons: [
              {
                id: "l1",
                order: 1,
                contents: [],
                quizzes: [],
                topics: [
                  {
                    id: "t1",
                    order: 1,
                    contents: [{ id: "tc1", order: 1, visited: true, completed: true }],
                    quizzes: [{ id: "tq1", order: 2, visited: false, completed: false }],
                  },
                ],
              },
            ],
          },
        ],
      },
    },
    // tc1 is visited+completed, so the resume target is the next leaf after
    // it in course order — the topic's own quiz, tq1.
    expected: { id: "tq1" },
  });

  testCases.push({
    name: "nothing visited anywhere resolves to the course's first leaf",
    input: {
      hierarchy: {
        contents: [{ id: "c1", order: 1, visited: false, completed: false }],
        quizzes: [],
        modules: [],
      },
    },
    expected: { id: "c1" },
  });

  testCases.push({
    name: "no hierarchy resolves to null",
    input: {},
    expected: null,
  });

  // --- Recency ---------------------------------------------------------
  // The student worked in l2 on the 16th, then came BACK to l1 on the 18th.
  // "Continue Learning" must follow them back, not strand them at the
  // furthest point they ever scrolled to.
  testCases.push({
    name: "resumes at the most recently visited leaf, not the furthest in course order",
    input: {
      hierarchy: {
        contents: [],
        quizzes: [],
        modules: [
          {
            id: "m1",
            order: 1,
            contents: [],
            quizzes: [],
            lessons: [
              {
                id: "l1",
                order: 1,
                contents: [
                  {
                    id: "recent",
                    order: 1,
                    visited: true,
                    visitedAt: "2026-09-18T10:33:48.088Z",
                    completed: false,
                  },
                ],
                quizzes: [],
                topics: [],
              },
              {
                id: "l2",
                order: 2,
                contents: [
                  {
                    id: "furthest",
                    order: 1,
                    visited: true,
                    visitedAt: "2026-09-16T06:14:25.407Z",
                    completed: false,
                  },
                ],
                quizzes: [],
                topics: [],
              },
            ],
          },
        ],
      },
    },
    expected: { id: "recent" },
  });

  // --- Stranded work ---------------------------------------------------
  // Everything from the anchor forward is done, but an earlier leaf was
  // never opened (content added after the student passed through). Continue
  // Learning has to route back to it or the course can never be finished.
  testCases.push({
    name: "falls back to stranded incomplete work when nothing after the anchor is left",
    input: {
      hierarchy: {
        contents: [
          { id: "stranded", order: 1, visited: false, completed: false },
          {
            id: "anchor",
            order: 2,
            visited: true,
            visitedAt: "2026-09-18T10:33:48.088Z",
            completed: true,
          },
        ],
        quizzes: [],
        modules: [],
      },
    },
    expected: { id: "stranded" },
  });

  // --- Real student roll-up --------------------------------------------
  // Captured from student rrrr@gmail.com in course C-CAT: they reached topic
  // 2.3 on the 17th, then returned to topic 1.1 on the 18th to read an image
  // added after their first pass. The next thing they actually owe is the
  // second image in 1.1 -- not topic 2.3, which is where the course-order
  // rule used to send them.
  testCases.push({
    name: "real roll-up resumes in Lesson 1, not the topic the student peeked ahead into",
    input: ccatStudentRollup,
    expected: { id: "cmu6l68bc00qxg81ylhyns15j" },
  });

  // --- SubTopic / Concept ---------------------------------------------------
  const old = normalizeCourseHierarchy(buildOldCourse());
  const neu = normalizeCourseHierarchy(buildNewCourse());
  const mixed = normalizeCourseHierarchy(buildMixedCourse());
  const courseLevel = normalizeCourseHierarchy(buildCourseLevelCourse());
  const courseLegacy = normalizeCourseHierarchy(buildCourseLevelCourse("legacy"));

  testCases.push({
    name: "NEW: nothing visited resolves to the first Concept's first leaf, with its full scope",
    input: toProgressHierarchy(neu),
    expected: { id: "k1c1", moduleId: "m1", lessonId: "l1", topicId: "t1", subTopicId: "st1", conceptId: "c1" },
  });

  testCases.push({
    name: "MIXED: a finished Topic-direct item resumes into the SubTopic, not past it",
    input: toProgressHierarchy(mixed, { t1c1: { visited: true, completed: true } }),
    expected: { id: "s1c1", topicId: "t1", subTopicId: "st1", conceptId: null },
  });

  testCases.push({
    name: "MIXED: a finished Concept quiz resumes to its SubTopic's own quiz",
    input: toProgressHierarchy(mixed, { cp1q1: { visited: true, completed: true } }),
    expected: { id: "s1q1", subTopicId: "st1", conceptId: null },
  });

  testCases.push({
    name: "MIXED: an unfinished Concept item is itself the target",
    input: toProgressHierarchy(mixed, { t1c1: { visited: true, completed: true }, cp1c1: { visited: true } }),
    expected: { id: "cp1c1", subTopicId: "st1", conceptId: "cp1" },
  });

  testCases.push({
    name: "COURSE: the last finished course content resumes into the first Module",
    input: toProgressHierarchy(courseLevel, { cc2: { visited: true, completed: true } }),
    expected: { id: "t1c1", moduleId: "m1", lessonId: "l1", topicId: "t1" },
  });

  testCases.push({
    name: "COURSE: a finished Module leaf resumes into the next Module, not back to course content",
    input: toProgressHierarchy(courseLevel, { t1c1: { visited: true, completed: true } }),
    expected: { id: "l2c1", moduleId: "m2", lessonId: "l2" },
  });

  testCases.push({
    name: "COURSE: the last Module's finished leaf resumes to the course-level quiz",
    input: toProgressHierarchy(courseLevel, { l2c1: { visited: true, completed: true } }),
    expected: { id: "cq1", moduleId: null, lessonId: null },
  });

  testCases.push({
    name: "COURSE: legacy stored orders resume in the grouped sequence too",
    input: toProgressHierarchy(courseLegacy, { t1c1: { visited: true, completed: true } }),
    expected: { id: "l2c1", moduleId: "m2", lessonId: "l2" },
  });

  // Resume must step through leaves in EXACTLY the player's unit order: for
  // every leaf in courseUnits order, finishing only that leaf resumes to the
  // leaf the player would show next.
  [
    ["OLD", old],
    ["NEW", neu],
    ["MIXED", mixed],
    ["COURSE", courseLevel],
    ["COURSE-LEGACY", courseLegacy],
  ].forEach(([label, course]) => {
    const playerOrder = flattenUnitItemIds(course, buildCourseUnits(course));
    playerOrder.slice(0, -1).forEach((leafId, i) => {
      testCases.push({
        name: `${label}: resume walks the same order as courseUnits (${leafId} → ${playerOrder[i + 1]})`,
        input: toProgressHierarchy(course, { [leafId]: { visited: true, completed: true } }),
        expected: { id: playerOrder[i + 1] },
      });
    });
  });

  let passed = 0;
  let failed = 0;

  console.log("=== RUNNING RESUME TARGET TESTS ===");
  testCases.forEach((tc) => {
    const result = resolveResumeTarget(tc.input);
    const matches =
      tc.expected === null
        ? result === null
        : Object.entries(tc.expected).every(([key, value]) => result?.[key] === value);

    if (matches) {
      console.log(`[PASS] ${tc.name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${tc.name}`);
      console.error("  Expected id:", tc.expected?.id ?? null);
      console.error("  Actual:     ", result);
      failed++;
    }
  });

  console.log(`\nRESULTS: ${passed} Passed, ${failed} Failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

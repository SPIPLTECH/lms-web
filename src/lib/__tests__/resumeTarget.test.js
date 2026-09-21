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

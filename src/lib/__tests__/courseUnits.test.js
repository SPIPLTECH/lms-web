import {
  buildCourseUnits,
  findUnitContaining,
  resolveLessonPathway,
  scopeLevel,
} from "../courseUnits.js";
import { normalizeCourseHierarchy } from "../courseMapper.js";
import {
  buildOldCourse,
  buildNewCourse,
  buildMixedCourse,
  buildCourseLevelCourse,
  flattenUnitItemIds,
  lessonsOf,
} from "./hierarchyFixtures.js";

/**
 * buildCourseUnits must keep OLD courses' sequence exactly as it was, turn a
 * Topic/SubTopic WITH children into a container (its own items as units, its
 * children as stops) and never emit an empty placeholder for it, and count
 * every Content/Quiz exactly once.
 */

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const keys = (units) => units.map((u) => u.key);

function runTests() {
  const cases = [];
  const old = normalizeCourseHierarchy(buildOldCourse());
  const neu = normalizeCourseHierarchy(buildNewCourse());
  const mixed = normalizeCourseHierarchy(buildMixedCourse());
  const courseLevel = normalizeCourseHierarchy(buildCourseLevelCourse());
  const courseLegacy = normalizeCourseHierarchy(buildCourseLevelCourse("legacy"));

  cases.push({
    name: "OLD: unit keys are exactly the pre-SubTopic sequence",
    run: () => keys(buildCourseUnits(old)),
    expected: ["course-content:root:0", "topic:t1", "topic:t2", "lesson:l2", "module-quiz:m1:0"],
  });

  cases.push({
    name: "OLD: a Topic placeholder's scope keeps its ids and adds null subTopicId/conceptId",
    run: () => buildCourseUnits(old).find((u) => u.key === "topic:t1").scope,
    expected: { moduleId: "m1", lessonId: "l1", topicId: "t1", subTopicId: null, conceptId: null },
  });

  cases.push({
    name: "NEW: a Topic with only SubTopics is a container, never an empty stop",
    run: () => keys(buildCourseUnits(neu)),
    expected: ["concept:c1", "concept:c2", "subtopic:st2"],
  });

  cases.push({
    name: "NEW: Concept stops carry their full parent chain",
    run: () => buildCourseUnits(neu).find((u) => u.key === "concept:c2").scope,
    expected: { moduleId: "m1", lessonId: "l1", topicId: "t1", subTopicId: "st1", conceptId: "c2" },
  });

  cases.push({
    name: "MIXED: Topic and SubTopic own items interleave with their children by order",
    run: () => keys(buildCourseUnits(mixed)),
    expected: [
      "topic-content:t1:0",
      "subtopic-content:st1:0",
      "concept:cp1",
      "subtopic-quiz:st1:1",
      "topic-quiz:t1:1",
      "topic:t2",
    ],
  });

  cases.push({
    name: "MIXED: own-item units report their own level",
    run: () =>
      buildCourseUnits(mixed).map((u) => scopeLevel(u.scope)),
    expected: ["topic", "subTopic", "concept", "subTopic", "topic", "topic"],
  });

  cases.push({
    name: "OLD/NEW/MIXED: every Content and Quiz is reachable exactly once (no double count)",
    run: () =>
      [
        [old, ["cc1", "t1c1", "t1c2", "t1q1", "t2c1", "l2c1", "l2q1", "m1q1"]],
        [neu, ["k1c1", "k1q1", "k2c1", "s2c1", "s2q1"]],
        [mixed, ["t1c1", "s1c1", "cp1c1", "cp1q1", "s1q1", "t1q1", "t2c1"]],
      ].map(([course, expectedIds]) => {
        const reached = flattenUnitItemIds(course, buildCourseUnits(course));
        return same([...reached].sort(), [...expectedIds].sort()) && reached.length === new Set(reached).size;
      }),
    expected: [true, true, true],
  });

  cases.push({
    name: "MIXED: player order walks Topic → SubTopic → Concept → back up",
    run: () => flattenUnitItemIds(mixed, buildCourseUnits(mixed)),
    expected: ["t1c1", "s1c1", "cp1c1", "cp1q1", "s1q1", "t1q1", "t2c1"],
  });

  cases.push({
    name: "every placeholder key is what resolveLessonPathway gives its scope",
    run: () =>
      [old, neu, mixed].every((course) =>
        buildCourseUnits(course)
          .filter((u) => u.placeholder)
          .every((u) => {
            const lesson = lessonsOf(course).find((l) => l.id === u.scope.lessonId);
            return resolveLessonPathway(lesson, u.scope).unitKey === u.key;
          })
      ),
    expected: true,
  });

  cases.push({
    name: "resolveLessonPathway defaults to the first child at each level",
    run: () => {
      const neuLesson = lessonsOf(neu)[0];
      const oldLessons = lessonsOf(old);
      return [
        resolveLessonPathway(neuLesson).unitKey,
        resolveLessonPathway(neuLesson, { topicId: "t1", subTopicId: "st2" }).unitKey,
        resolveLessonPathway(neuLesson, { topicId: "t1", subTopicId: "st1", conceptId: "c2" }).unitKey,
        resolveLessonPathway(neuLesson, { topicId: "t1", subTopicId: "stale-id" }).unitKey,
        resolveLessonPathway(oldLessons[0]).unitKey,
        resolveLessonPathway(oldLessons[1]).unitKey,
        resolveLessonPathway(neuLesson, { topicId: "t1", subTopicId: "st2" }).level,
        resolveLessonPathway(null).unitKey,
      ];
    },
    expected: ["concept:c1", "subtopic:st2", "concept:c2", "concept:c1", "topic:t1", "lesson:l2", "subTopic", null],
  });

  cases.push({
    name: "COURSE: rows are grouped Content → Modules → Quizzes",
    run: () => keys(buildCourseUnits(courseLevel)),
    expected: ["course-content:root:0", "topic:t1", "lesson:l2", "course-quiz:root:1"],
  });

  cases.push({
    name: "COURSE: the course-level quiz is the last stop, after every module",
    run: () => flattenUnitItemIds(courseLevel, buildCourseUnits(courseLevel)),
    expected: ["cc1", "cc2", "t1c1", "l2c1", "cq1"],
  });

  cases.push({
    name: "COURSE: stored orders that predate the grouping present the same way",
    run: () => [
      same(keys(buildCourseUnits(courseLegacy)), keys(buildCourseUnits(courseLevel))),
      flattenUnitItemIds(courseLegacy, buildCourseUnits(courseLegacy)),
    ],
    expected: [true, ["cc1", "cc2", "t1c1", "l2c1", "cq1"]],
  });

  cases.push({
    name: "COURSE: course-own units report the course level",
    run: () => buildCourseUnits(courseLevel).map((u) => scopeLevel(u.scope)),
    expected: ["course", "topic", "lesson", "course"],
  });

  cases.push({
    name: "findUnitContaining resolves a mixed Topic's own content and a SubTopic's own quiz",
    run: () => {
      const units = buildCourseUnits(mixed);
      return [findUnitContaining(units, "t1c1")?.key, findUnitContaining(units, "s1q1")?.key, findUnitContaining(units, "cp1c1")];
    },
    expected: ["topic-content:t1:0", "subtopic-quiz:st1:1", undefined],
  });

  let passed = 0;
  let failed = 0;
  console.log("=== RUNNING COURSE UNITS TESTS ===");
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

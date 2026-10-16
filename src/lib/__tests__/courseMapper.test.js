import { normalizeCourseHierarchy, getQuizPlacement, filterQuizzesPlacedAt, getTopicTreeContents } from "../courseMapper.js";
import { buildOldCourse, buildNewCourse, buildCourseLevelCourse, buildMixedCourse } from "./hierarchyFixtures.js";

/**
 * normalizeCourseHierarchy must place every quiz at exactly one level — its
 * most specific parent — even though the backend returns a quiz inside every
 * ancestor relation it carries an id for, and must never flatten a child's
 * CQA into its parent.
 */

const ids = (list) => (list || []).map((x) => x.id);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Every quiz id rendered anywhere in the normalized tree, with duplicates kept.
function allPlacedQuizIds(course) {
  const out = [...ids(course.quizzes)];
  for (const mod of course.modules) {
    out.push(...ids(mod.quizzes));
    for (const lesson of mod.lessons) {
      out.push(...ids(lesson.quizzes));
      for (const topic of lesson.topics) {
        out.push(...ids(topic.quizzes));
        for (const subTopic of topic.subTopics) {
          out.push(...ids(subTopic.quizzes));
          for (const concept of subTopic.concepts) out.push(...ids(concept.quizzes));
        }
      }
    }
  }
  return out;
}

function runTests() {
  const cases = [];

  cases.push({
    name: "OLD: every level keeps exactly the quizzes it had before",
    run: () => {
      const c = normalizeCourseHierarchy(buildOldCourse());
      const m1 = c.modules[0];
      const [l1, l2] = m1.lessons;
      return {
        course: ids(c.quizzes),
        module: ids(m1.quizzes),
        l1: ids(l1.quizzes),
        l2: ids(l2.quizzes),
        t1: ids(l1.topics[0].quizzes),
        t1SubTopics: l1.topics[0].subTopics,
      };
    },
    expected: { course: [], module: ["m1q1"], l1: [], l2: ["l2q1"], t1: ["t1q1"], t1SubTopics: [] },
  });

  cases.push({
    name: "OLD: no quiz is duplicated",
    run: () => {
      const placed = allPlacedQuizIds(normalizeCourseHierarchy(buildOldCourse()));
      return placed.length === new Set(placed).size && placed.length === 3;
    },
    expected: true,
  });

  cases.push({
    name: "NEW: SubTopic/Concept quizzes never leak into Topic, Lesson, Module or Course",
    run: () => {
      const c = normalizeCourseHierarchy(buildNewCourse());
      const m1 = c.modules[0];
      const l1 = m1.lessons[0];
      const t1 = l1.topics[0];
      const [st1, st2] = t1.subTopics;
      return {
        course: ids(c.quizzes),
        module: ids(m1.quizzes),
        lesson: ids(l1.quizzes),
        topic: ids(t1.quizzes),
        st1: ids(st1.quizzes),
        st2: ids(st2.quizzes),
        c1: ids(st1.concepts[0].quizzes),
        c2: ids(st1.concepts[1].quizzes),
      };
    },
    expected: { course: [], module: [], lesson: [], topic: [], st1: [], st2: ["s2q1"], c1: ["k1q1"], c2: [] },
  });

  cases.push({
    name: "NEW: SubTopics and Concepts are sorted by order and CQA is not flattened upward",
    run: () => {
      const t1 = normalizeCourseHierarchy(buildNewCourse()).modules[0].lessons[0].topics[0];
      const [st1, st2] = t1.subTopics;
      return {
        subTopics: ids(t1.subTopics),
        concepts: ids(st1.concepts),
        topicContents: ids(t1.contents),
        st1Contents: ids(st1.contents),
        st2Contents: ids(st2.contents),
        c1Contents: ids(st1.concepts[0].contents),
        st2Assignments: ids(st2.assignments),
        c1Assignments: ids(st1.concepts[0].assignments),
        c2Assignments: ids(st1.concepts[1].assignments),
      };
    },
    expected: {
      subTopics: ["st1", "st2"],
      concepts: ["c1", "c2"],
      topicContents: [],
      st1Contents: [],
      st2Contents: ["s2c1"],
      c1Contents: ["k1c1"],
      st2Assignments: ["s2a1"],
      c1Assignments: ["k1a1"],
      c2Assignments: [],
    },
  });

  cases.push({
    name: "MIXED: Topic, SubTopic and Concept each keep only their own quiz",
    run: () => {
      const t1 = normalizeCourseHierarchy(buildMixedCourse()).modules[0].lessons[0].topics[0];
      const st1 = t1.subTopics[0];
      return {
        topic: ids(t1.quizzes),
        subTopic: ids(st1.quizzes),
        concept: ids(st1.concepts[0].quizzes),
        topicContents: ids(t1.contents),
        subTopicContents: ids(st1.contents),
      };
    },
    expected: { topic: ["t1q1"], subTopic: ["s1q1"], concept: ["cp1q1"], topicContents: ["t1c1"], subTopicContents: ["s1c1"] },
  });

  cases.push({
    name: "NEW + MIXED: every quiz is placed exactly once",
    run: () =>
      [buildNewCourse(), buildMixedCourse()].map((raw) => {
        const placed = allPlacedQuizIds(normalizeCourseHierarchy(raw));
        return placed.length === new Set(placed).size && placed.length === raw.quizzes.length;
      }),
    expected: [true, true],
  });

  cases.push({
    name: "getQuizPlacement: most specific parent id wins",
    run: () => [
      getQuizPlacement({ courseId: "c", moduleId: "m", lessonId: "l", topicId: "t", subTopicId: "s", conceptId: "k" }),
      getQuizPlacement({ courseId: "c", moduleId: "m", lessonId: "l", topicId: "t", subTopicId: "s" }),
      getQuizPlacement({ courseId: "c", subTopicId: "s" }),
      getQuizPlacement({ courseId: "c", moduleId: "m", lessonId: "l", topicId: "t" }),
      getQuizPlacement({ courseId: "c" }),
    ],
    expected: [
      { level: "concept", parentId: "k" },
      { level: "subTopic", parentId: "s" },
      { level: "subTopic", parentId: "s" },
      { level: "topic", parentId: "t" },
      { level: "course", parentId: "c" },
    ],
  });

  cases.push({
    name: "filterQuizzesPlacedAt picks one level's quizzes from a course-wide list",
    run: () => {
      const pool = buildMixedCourse().quizzes;
      return {
        subTopic: ids(filterQuizzesPlacedAt(pool, "subTopic", "st1")),
        concept: ids(filterQuizzesPlacedAt(pool, "concept", "cp1")),
        topic: ids(filterQuizzesPlacedAt(pool, "topic", "t1")),
      };
    },
    expected: { subTopic: ["s1q1"], concept: ["cp1q1"], topic: ["t1q1"] },
  });

  cases.push({
    name: "getTopicTreeContents: OLD Topic is just its own contents; MIXED includes SubTopic and Concept contents",
    run: () => {
      const oldTopic = normalizeCourseHierarchy(buildOldCourse()).modules[0].lessons[0].topics[0];
      const mixedTopic = normalizeCourseHierarchy(buildMixedCourse()).modules[0].lessons[0].topics[0];
      return [ids(getTopicTreeContents(oldTopic)), ids(getTopicTreeContents(mixedTopic)), ids(getTopicTreeContents(null))];
    },
    expected: [["t1c1", "t1c2"], ["t1c1", "s1c1", "cp1c1"], []],
  });

  cases.push({
    name: "a course payload without subTopics (older API shape) still normalizes",
    run: () => {
      const raw = buildOldCourse();
      delete raw.modules[0].lessons[0].topics[0].subTopics;
      const t1 = normalizeCourseHierarchy(raw).modules[0].lessons[0].topics[0];
      return { subTopics: t1.subTopics, quizzes: ids(t1.quizzes) };
    },
    expected: { subTopics: [], quizzes: ["t1q1"] },
  });

  cases.push({
    name: "every level keeps its own assignments, with the order the Course Map sorts them by",
    run: () => {
      const course = normalizeCourseHierarchy(buildCourseLevelCourse());
      const neu = normalizeCourseHierarchy(buildNewCourse());
      const st1 = neu.modules[0].lessons[0].topics[0].subTopics.find((s) => s.id === "st1");
      const st2 = neu.modules[0].lessons[0].topics[0].subTopics.find((s) => s.id === "st2");
      return [
        course.assignments.map((a) => `${a.id}@${a.order}`),
        ids(st2.assignments),
        ids(st1.concepts.find((c) => c.id === "c1").assignments),
      ];
    },
    // The Course Map merges these into each level's sequence by `order`, so
    // normalization must neither drop them nor lift them to another level.
    expected: [["ca1@5"], ["s2a1"], ["k1a1"]],
  });

  let passed = 0;
  let failed = 0;
  console.log("=== RUNNING COURSE MAPPER TESTS ===");
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

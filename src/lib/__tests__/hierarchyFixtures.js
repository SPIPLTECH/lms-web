/**
 * Shared OLD / NEW / MIXED course fixtures for the hierarchy utility tests.
 *
 * Each builder returns a FRESH object shaped like GET /courses/:id — including
 * the backend's real quiz behavior: a quiz row carries every ancestor id it was
 * created with, so the same quiz appears in every ancestor's `quizzes`
 * relation (and course-level `quizzes` lists every quiz in the course).
 *
 * Content is typed VIDEO so no HTML document merging hides an id.
 */

const content = (id, order, parent) => ({ id, order, type: "VIDEO", title: id, ...parent });

// A quiz placed at `leaf`, carrying all the ancestor ids the Composer sends.
const quiz = (id, order, ids) => ({ id, order, title: id, courseId: "course1", ...ids });

/** Adds a quiz to every ancestor relation that the backend would return it in. */
function attachQuiz(course, q) {
  course.quizzes.push(q);
  for (const mod of course.modules) {
    if (q.moduleId === mod.id) mod.quizzes.push(q);
    for (const lesson of mod.lessons) {
      if (q.lessonId === lesson.id) lesson.quizzes.push(q);
      for (const topic of lesson.topics || []) {
        if (q.topicId === topic.id) topic.quizzes.push(q);
        for (const subTopic of topic.subTopics || []) {
          if (q.subTopicId === subTopic.id) subTopic.quizzes.push(q);
          for (const concept of subTopic.concepts || []) {
            if (q.conceptId === concept.id) concept.quizzes.push(q);
          }
        }
      }
    }
  }
}

const node = (id, order, extra = {}) => ({
  id,
  title: id,
  order,
  contents: [],
  quizzes: [],
  assignments: [],
  ...extra,
});

/**
 * OLD: Course → Module → Lesson → Topic → CQA, plus a zero-Topic Lesson and
 * a course-direct content. Topics come back with `subTopics: []`, exactly as
 * the updated backend returns them for an existing course.
 */
export function buildOldCourse() {
  const course = node("course1", 0, {
    contents: [content("cc1", 1, { courseId: "course1" })],
    modules: [
      node("m1", 1, {
        lessons: [
          node("l1", 1, {
            topics: [
              node("t1", 1, {
                contents: [content("t1c1", 1, { topicId: "t1" }), content("t1c2", 2, { topicId: "t1" })],
                subTopics: [],
              }),
              node("t2", 2, { contents: [content("t2c1", 1, { topicId: "t2" })], subTopics: [] }),
            ],
          }),
          node("l2", 2, { contents: [content("l2c1", 1, { lessonId: "l2" })], topics: [] }),
        ],
      }),
    ],
  });
  attachQuiz(course, quiz("t1q1", 3, { moduleId: "m1", lessonId: "l1", topicId: "t1" }));
  attachQuiz(course, quiz("l2q1", 2, { moduleId: "m1", lessonId: "l2" }));
  attachQuiz(course, quiz("m1q1", 3, { moduleId: "m1" }));
  return course;
}

/**
 * NEW: the Topic owns no CQA of its own — everything lives in SubTopics and
 * Concepts. SubTopics are listed out of order on purpose.
 */
export function buildNewCourse() {
  const course = node("course1", 0, {
    modules: [
      node("m1", 1, {
        lessons: [
          node("l1", 1, {
            topics: [
              node("t1", 1, {
                subTopics: [
                  node("st2", 2, {
                    contents: [content("s2c1", 1, { subTopicId: "st2" })],
                    assignments: [{ id: "s2a1", title: "s2a1", subTopicId: "st2" }],
                    concepts: [],
                  }),
                  node("st1", 1, {
                    concepts: [
                      node("c2", 2, { contents: [content("k2c1", 1, { conceptId: "c2" })] }),
                      node("c1", 1, {
                        contents: [content("k1c1", 1, { conceptId: "c1" })],
                        assignments: [{ id: "k1a1", title: "k1a1", conceptId: "c1" }],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
  attachQuiz(course, quiz("k1q1", 2, { moduleId: "m1", lessonId: "l1", topicId: "t1", subTopicId: "st1", conceptId: "c1" }));
  attachQuiz(course, quiz("s2q1", 2, { moduleId: "m1", lessonId: "l1", topicId: "t1", subTopicId: "st2" }));
  return course;
}

/**
 * MIXED: Topic direct CQA + a SubTopic with its own CQA + a Concept with CQA,
 * interleaved by `order`:
 *
 *   t1:  t1c1 (1)  ·  st1 (2)  ·  t1q1 (5)
 *   st1: s1c1 (1)  ·  cp1 (2)  ·  s1q1 (3)
 *   cp1: cp1c1 (1) ·  cp1q1 (2)
 *
 * Plus a second, plain Topic t2 after it.
 */
export function buildMixedCourse() {
  const course = node("course1", 0, {
    modules: [
      node("m1", 1, {
        lessons: [
          node("l1", 1, {
            topics: [
              node("t1", 1, {
                contents: [content("t1c1", 1, { topicId: "t1" })],
                subTopics: [
                  node("st1", 2, {
                    contents: [content("s1c1", 1, { subTopicId: "st1" })],
                    concepts: [node("cp1", 2, { contents: [content("cp1c1", 1, { conceptId: "cp1" })] })],
                  }),
                ],
              }),
              node("t2", 2, { contents: [content("t2c1", 1, { topicId: "t2" })], subTopics: [] }),
            ],
          }),
        ],
      }),
    ],
  });
  attachQuiz(course, quiz("t1q1", 5, { moduleId: "m1", lessonId: "l1", topicId: "t1" }));
  attachQuiz(course, quiz("s1q1", 3, { moduleId: "m1", lessonId: "l1", topicId: "t1", subTopicId: "st1" }));
  attachQuiz(course, quiz("cp1q1", 2, { moduleId: "m1", lessonId: "l1", topicId: "t1", subTopicId: "st1", conceptId: "cp1" }));
  return course;
}

/**
 * COURSE level: the Course sequence is four groups —
 * Content → Modules → Assignments → Quizzes — because a course-level
 * Assignment is only given once every Module is done.
 *
 *   grouped (what the backend now writes):
 *     cc1 (1) · cc2 (2) · m1 (3) · m2 (4) · ca1 (5) · cq1 (6)
 *   legacy (rows written before the rule existed, mixed together):
 *     cc1 (1) · m1 (2) · cc2 (3) · m2 (4) · cq1 (5) · ca1 (6)
 *
 * Both must present identically: the frontend groups by row kind, so stored
 * orders that predate the rule can never show a Quiz between two Modules.
 */
const COURSE_LEVEL_ORDERS = {
  grouped: { cc1: 1, cc2: 2, m1: 3, m2: 4, ca1: 5, cq1: 6 },
  legacy: { cc1: 1, m1: 2, cc2: 3, m2: 4, cq1: 5, ca1: 6 },
};

export function buildCourseLevelCourse(variant = "grouped") {
  const at = COURSE_LEVEL_ORDERS[variant];
  const course = node("course1", 0, {
    contents: [content("cc1", at.cc1, { courseId: "course1" }), content("cc2", at.cc2, { courseId: "course1" })],
    assignments: [{ id: "ca1", title: "ca1", order: at.ca1, courseId: "course1" }],
    modules: [
      node("m1", at.m1, {
        lessons: [
          node("l1", 1, {
            topics: [node("t1", 1, { contents: [content("t1c1", 1, { topicId: "t1" })], subTopics: [] })],
          }),
        ],
      }),
      node("m2", at.m2, {
        lessons: [node("l2", 1, { contents: [content("l2c1", 1, { lessonId: "l2" })], topics: [] })],
      }),
    ],
  });
  attachQuiz(course, quiz("cq1", at.cq1, {}));
  return course;
}

/**
 * The GET /progress/courses/:courseId `hierarchy` for a NORMALIZED course
 * tree — same ids, orders and nesting keys (`subTopics`/`concepts`) the
 * backend roll-up uses, with every level holding only its own items.
 *
 * `itemState` maps item id -> { visited, completed, attempted, ... };
 * `nodeState` maps container id -> summary overrides ({ completed, ... }).
 */
export function toProgressHierarchy(course, itemState = {}, nodeState = {}) {
  const item = (kind) => (raw) => ({
    id: raw.id,
    kind,
    order: raw.order,
    visited: false,
    completed: false,
    ...(kind === "QUIZ" ? { attempted: false } : {}),
    ...(itemState[raw.id] || {}),
  });

  const toNode = (entity, childKey, childTransform) => {
    const contents = (entity.contents || []).map(item("CONTENT"));
    const quizzes = (entity.quizzes || []).map(item("QUIZ"));
    const assignments = (entity.assignments || []).map(item("ASSIGNMENT"));
    const children = childKey ? (entity[childKey] || []).map(childTransform) : undefined;
    const own = [...contents, ...quizzes, ...assignments];
    const totalItems = own.length + (children || []).length;
    return {
      id: entity.id,
      title: entity.title,
      order: entity.order,
      contents,
      quizzes,
      assignments,
      ...(childKey ? { [childKey]: children } : {}),
      totalItems,
      completedItems: 0,
      progressPercent: 0,
      applicable: totalItems > 0,
      completed: false,
      visited: false,
      ...(nodeState[entity.id] || {}),
    };
  };

  const concept = (c) => toNode(c, null);
  const subTopic = (s) => toNode(s, "concepts", concept);
  const topic = (t) => toNode(t, "subTopics", subTopic);
  const lesson = (l) => toNode(l, "topics", topic);
  const mod = (m) => toNode(m, "lessons", lesson);

  return { courseId: course.id, hierarchy: toNode(course, "modules", mod) };
}

export const lessonsOf = (course) => course.modules.flatMap((m) => m.lessons);

// The container a placeholder unit's blocks come from, found by its scope.
function placeholderContainer(course, scope) {
  const lesson = lessonsOf(course).find((l) => l.id === scope.lessonId);
  const topic = lesson?.topics.find((t) => t.id === scope.topicId);
  const subTopic = topic?.subTopics.find((s) => s.id === scope.subTopicId);
  const concept = subTopic?.concepts.find((c) => c.id === scope.conceptId);
  return concept || subTopic || topic || lesson;
}

// Every Content/Quiz id reachable through the unit sequence, in player order.
export function flattenUnitItemIds(course, units) {
  const out = [];
  for (const unit of units) {
    if (unit.placeholder) {
      const container = placeholderContainer(course, unit.scope);
      const blocks = [
        ...(container.contents || []).map((item) => ({ kind: "content", item })),
        ...(container.quizzes || []).map((item) => ({ kind: "quiz", item })),
      ].sort((a, b) => {
        const orderDiff = (a.item.order ?? 0) - (b.item.order ?? 0);
        if (orderDiff !== 0) return orderDiff;
        return a.kind === b.kind ? 0 : a.kind === "content" ? -1 : 1;
      });
      out.push(...blocks.map((b) => b.item.id));
    } else {
      for (const block of unit.blocks) out.push(...(block.item.contentIds?.length ? block.item.contentIds : [block.item.id]));
    }
  }
  return out;
}

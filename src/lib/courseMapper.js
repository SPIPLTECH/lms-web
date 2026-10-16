/**
 * Normalizes a course object from API (Student or Instructor) into a
 * consistent hierarchy:
 *
 *   Course -> Module -> Lesson -> Topic -> SubTopic -> Concept
 *
 * with Content/Quiz/Assignment (CQA) possible at every level. SubTopic and
 * Concept are optional: a Topic with no `subTopics` behaves exactly as it
 * always has, and a Topic may hold its own CQA alongside SubTopics (mixed).
 * Each level keeps only its OWN CQA — child CQA is never flattened into a
 * parent.
 *
 * Also narrows each level's `quizzes` down to the ones actually scoped
 * there. Quiz rows can carry every ancestor's foreign key at once
 * (courseId + moduleId + lessonId + topicId + subTopicId, instead of just the
 * one they were created under) — the Composer sends them that way, and the
 * backend stores what it is sent. Left unfiltered, the same quiz would appear
 * at Course, Module, Lesson, Topic, *and* SubTopic level simultaneously.
 * Mirrors the narrowing the instructor Course page does inline
 * (`effectiveCourseQuizzes`/`effectiveModules` in
 * app/instructor/courses/[courseId]/page.jsx) so both sides agree on
 * where a quiz actually belongs.
 *
 * @param {Object} rawCourse Course entity from API
 * @returns {Object} Normalized course object
 */

// Most specific parent first — the backend's own placement precedence.
const QUIZ_PARENT_LEVELS = [
  ["conceptId", "concept"],
  ["subTopicId", "subTopic"],
  ["topicId", "topic"],
  ["lessonId", "lesson"],
  ["moduleId", "module"],
];

/**
 * Where a quiz actually lives: its most specific parent id wins
 * (concept > subTopic > topic > lesson > module > course).
 *
 * @returns {{ level: "course"|"module"|"lesson"|"topic"|"subTopic"|"concept", parentId: string|null }}
 */
export function getQuizPlacement(quiz) {
  for (const [field, level] of QUIZ_PARENT_LEVELS) {
    if (quiz?.[field]) return { level, parentId: quiz[field] };
  }
  return { level: "course", parentId: quiz?.courseId ?? null };
}

/**
 * The quizzes from `quizzes` whose most specific placement is exactly this
 * level and parent — for callers holding a course-wide quiz list rather than
 * a parent's own relation (e.g. the instructor Course Map, whose lazily
 * loaded SubTopic/Concept rows carry no quizzes of their own).
 */
export function filterQuizzesPlacedAt(quizzes, level, parentId) {
  return (quizzes || []).filter((quiz) => {
    const placement = getQuizPlacement(quiz);
    return placement.level === level && String(placement.parentId) === String(parentId);
  });
}

/**
 * A Topic's own contents followed by every SubTopic's and Concept's contents
 * under it. For summaries that count or list a Topic's material (curriculum
 * counts, durations) — never for navigation, which must keep each level's
 * CQA on its own level.
 */
export function getTopicTreeContents(topic) {
  return [
    ...(topic?.contents || []),
    ...(topic?.subTopics || []).flatMap((subTopic) => [
      ...(subTopic.contents || []),
      ...(subTopic.concepts || []).flatMap((concept) => concept.contents || []),
    ]),
  ];
}

const byOrder = (a, b) => (a.order || 0) - (b.order || 0);

function normalizeConcept(concept, cIdx) {
  return {
    ...concept,
    order: typeof concept.order === "number" ? concept.order : cIdx + 1,
    contents: [...(concept.contents || [])].sort(byOrder),
    quizzes: concept.quizzes || [],
    assignments: concept.assignments || [],
  };
}

function normalizeSubTopic(subTopic, sIdx) {
  return {
    ...subTopic,
    order: typeof subTopic.order === "number" ? subTopic.order : sIdx + 1,
    contents: [...(subTopic.contents || [])].sort(byOrder),
    quizzes: (subTopic.quizzes || []).filter((q) => !q.conceptId),
    assignments: subTopic.assignments || [],
    concepts: (subTopic.concepts || []).map(normalizeConcept).sort(byOrder),
  };
}

export function normalizeCourseHierarchy(rawCourse) {
  if (!rawCourse) return null;

  const rawModules = rawCourse.modules || [];

  const modules = rawModules.map((mod, mIdx) => {
    const rawLessons = mod.lessons || [];

    const lessons = rawLessons.map((lesson, lIdx) => {
      const rawTopics = lesson.topics || [];

      const topics = rawTopics.map((topic, tIdx) => {
        const contents = (topic.contents || []).sort((a, b) => (a.order || 0) - (b.order || 0));

        return {
          ...topic,
          order: typeof topic.order === "number" ? topic.order : tIdx + 1,
          contents,
          quizzes: (topic.quizzes || []).filter((q) => !q.subTopicId && !q.conceptId),
          subTopics: (topic.subTopics || []).map(normalizeSubTopic).sort(byOrder),
        };
      }).sort((a, b) => (a.order || 0) - (b.order || 0));

      return {
        ...lesson,
        order: typeof lesson.order === "number" ? lesson.order : lIdx + 1,
        topics,
        quizzes: (lesson.quizzes || []).filter((q) => !q.topicId && !q.subTopicId && !q.conceptId),
      };
    }).sort((a, b) => (a.order || 0) - (b.order || 0));

    return {
      ...mod,
      order: typeof mod.order === "number" ? mod.order : mIdx + 1,
      lessons,
      quizzes: (mod.quizzes || []).filter((q) => !q.lessonId && !q.topicId && !q.subTopicId && !q.conceptId),
    };
  }).sort((a, b) => (a.order || 0) - (b.order || 0));

  return {
    ...rawCourse,
    modules,
    quizzes: (rawCourse.quizzes || []).filter(
      (q) => !q.moduleId && !q.lessonId && !q.topicId && !q.subTopicId && !q.conceptId
    ),
  };
}

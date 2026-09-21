import { mapOrder, courseMapOrder } from "./courseUnits.js";

// Same three-way merge courseUnits.js's walkLevel uses: a level's own
// content and quizzes interleaved with its child containers (lessons under a
// module, topics under a lesson), sorted by `order` with mapOrder's
// content-before-child-before-quiz tie-break — or, at Course level, by
// courseMapOrder's groups. Reusing those comparators (rather than a parallel
// copy) is what keeps this in permanent lockstep with the player.
const mergeByOrder = (contents, quizzes, children, compare = mapOrder) => {
  const rows = [
    ...(contents || []).map((item) => ({ kind: "content", item })),
    ...(quizzes || []).map((item) => ({ kind: "quiz", item })),
    ...(children || []).map((item) => ({ kind: "child", item })),
  ];
  return rows.sort(compare);
};

/**
 * The whole course's Content/Quiz leaves, flattened into the exact order the
 * player's courseUnits (lib/courseUnits.js) walks them: Course-direct first,
 * then each Module with its own content/quizzes interleaved (by `order`)
 * with its Lessons, each Lesson's own content/quizzes interleaved with its
 * Topics (or, with no Topics, just merged together), each Topic's own
 * content/quizzes interleaved with its SubTopics (or just merged together
 * when it has none), and each SubTopic's own content/quizzes interleaved
 * with its Concepts the same way. Built from the Progress roll-up's
 * shape instead of the course tree, since this is the only place
 * visited/completed live per item. Assignments are excluded — they aren't
 * reachable in the content player's block sequence yet.
 */
function buildLeafSequence(hierarchy) {
  const leaves = [];

  const pushLeaf = (kind, raw, scope) => {
    leaves.push({
      kind,
      id: raw.id,
      visited: raw.visited === true,
      completed: raw.completed === true,
      ...scope,
    });
  };

  // One container's own leaves interleaved with its child containers, each
  // child handed to `onChild`. A container with no children (a Topic with no
  // SubTopics, a Concept) degenerates to its own items merged by order —
  // exactly what the pre-SubTopic walk did for every Topic.
  const pushContainerLeaves = (container, children, scope, onChild, compare) => {
    for (const row of mergeByOrder(container.contents, container.quizzes, children, compare)) {
      if (row.kind !== "child") {
        pushLeaf(row.kind, row.item, scope);
        continue;
      }
      onChild(row.item);
    }
  };

  const pushConceptLeaves = (concept, subTopicScope) => {
    pushContainerLeaves(concept, [], { ...subTopicScope, conceptId: concept.id }, () => {});
  };

  const pushSubTopicLeaves = (subTopic, topicScope) => {
    const subTopicScope = { ...topicScope, subTopicId: subTopic.id };
    pushContainerLeaves(subTopic, subTopic.concepts, subTopicScope, (concept) =>
      pushConceptLeaves(concept, subTopicScope)
    );
  };

  const noScope = { moduleId: null, lessonId: null, topicId: null, subTopicId: null, conceptId: null };

  const pushModuleLeaves = (mod) => {
    const moduleScope = { ...noScope, moduleId: mod.id };

    for (const row of mergeByOrder(mod.contents, mod.quizzes, mod.lessons)) {
      if (row.kind !== "child") {
        pushLeaf(row.kind, row.item, moduleScope);
        continue;
      }

      const lesson = row.item;
      const lessonScope = { ...moduleScope, lessonId: lesson.id };
      const hasTopics = (lesson.topics?.length ?? 0) > 0;

      if (!hasTopics) {
        for (const leafRow of mergeByOrder(lesson.contents, lesson.quizzes, [])) {
          pushLeaf(leafRow.kind, leafRow.item, lessonScope);
        }
        continue;
      }

      for (const leafRow of mergeByOrder(lesson.contents, lesson.quizzes, lesson.topics)) {
        if (leafRow.kind !== "child") {
          pushLeaf(leafRow.kind, leafRow.item, lessonScope);
          continue;
        }

        const topic = leafRow.item;
        const topicScope = { ...lessonScope, topicId: topic.id };
        pushContainerLeaves(topic, topic.subTopics, topicScope, (subTopic) =>
          pushSubTopicLeaves(subTopic, topicScope)
        );
      }
    }
  };

  // Course level: its own content/quizzes and its Modules are ONE sequence,
  // walked in the Course groups (Content -> Modules -> Assignments -> Quizzes)
  // by the very comparator the player uses.
  pushContainerLeaves(hierarchy, hierarchy.modules, noScope, pushModuleLeaves, courseMapOrder);

  return leaves;
}

/**
 * Resolves exactly where "Continue Learning" should land the student,
 * purely from the backend's visited/completed roll-up (GET
 * /progress/courses/:courseId) — no DB-saved "last lesson" state involved.
 *
 * Finds the LAST leaf, in course order, that has been visited at all (a
 * container's own rolled-up `visited` flag isn't usable for this: it only
 * turns true once EVERY descendant is visited, which tells you a level is
 * finished, not where the student currently is — so this walks the actual
 * Content/Quiz leaves' own visited flags instead, which is exactly the
 * module -> content/lesson/quiz -> lesson -> content/quiz/topic -> topic
 * content drill-down collapses to when done in course order).
 *
 *   - visited && !completed -> that leaf IS the resume target.
 *   - visited && completed  -> nothing left to do there, so the NEXT leaf
 *     (course order) is the target instead.
 *   - nothing visited anywhere -> the course's very first leaf (a fresh
 *     student's first visit).
 *   - the whole course's last leaf is visited+completed -> that same leaf
 *     (review mode; there is no "next").
 *
 * @returns {{kind: 'content'|'quiz', id: string, moduleId: string|null,
 *   lessonId: string|null, topicId: string|null, subTopicId: string|null,
 *   conceptId: string|null}|null} null when progress data isn't available or
 *   the course has no trackable leaves at all.
 */
export function resolveResumeTarget(progressData) {
  const hierarchy = progressData?.hierarchy;
  if (!hierarchy) return null;

  const leaves = buildLeafSequence(hierarchy);
  if (leaves.length === 0) return null;

  let lastVisitedIndex = -1;
  for (let i = 0; i < leaves.length; i++) {
    if (leaves[i].visited) lastVisitedIndex = i;
  }

  if (lastVisitedIndex === -1) return leaves[0];

  const lastVisited = leaves[lastVisitedIndex];
  if (!lastVisited.completed) return lastVisited;

  return leaves[lastVisitedIndex + 1] || lastVisited;
}

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
      visitedAt: raw.visitedAt ?? null,
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
 * Anchored on the MOST RECENTLY visited leaf (`visitedAt`), not the one
 * furthest along in course order. Those two answer different questions, and
 * the difference is user-visible: a student who peeks ahead at a later
 * lesson and then goes back to finish an earlier one is, by the course-order
 * rule, pinned to that peek forever — Continue Learning keeps throwing them
 * past the work they are actually doing. Container roll-up flags are no help
 * either (a container's `visited` only turns true once EVERY descendant is
 * visited, and it is sticky once set), so this walks the Content/Quiz leaves'
 * own flags.
 *
 *   - anchor not completed -> the anchor IS the resume target (they were
 *     mid-way through it).
 *   - anchor completed -> the next INCOMPLETE leaf after it in course order.
 *   - nothing incomplete after it -> the first incomplete leaf anywhere,
 *     so work stranded behind the anchor (content added to a topic after
 *     the student already passed through it) stays reachable instead of
 *     holding the course below 100% forever.
 *   - nothing visited anywhere -> the course's very first leaf (a fresh
 *     student's first visit).
 *   - every leaf completed -> the anchor itself (review mode).
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

  // Newest visitedAt wins. Ties break toward course order (`>=`): one screen
  // of grouped content is marked visited in a single batch, so those rows
  // share a timestamp to the millisecond and the later one is the true edge.
  // Roll-up rows written before visitedAt existed carry no timestamp at all
  // — they all score -Infinity, which collapses this back to the original
  // "furthest visited leaf in course order" rule for that legacy data.
  let anchorIndex = -1;
  let anchorTime = -Infinity;
  for (let i = 0; i < leaves.length; i++) {
    if (!leaves[i].visited) continue;
    const parsed = Date.parse(leaves[i].visitedAt ?? "");
    const time = Number.isNaN(parsed) ? -Infinity : parsed;
    if (time >= anchorTime) {
      anchorTime = time;
      anchorIndex = i;
    }
  }

  if (anchorIndex === -1) return leaves[0];

  const anchor = leaves[anchorIndex];
  if (!anchor.completed) return anchor;

  const isIncomplete = (leaf) => !leaf.completed;
  return (
    leaves.slice(anchorIndex + 1).find(isIncomplete) || leaves.find(isIncomplete) || anchor
  );
}

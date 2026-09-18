import { mapOrder } from "./courseUnits.js";

const byOrder = (list) => [...(list || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

// Same three-way merge courseUnits.js's walkLevel uses: a level's own
// content and quizzes interleaved with its child containers (lessons under a
// module, topics under a lesson), sorted by `order` with mapOrder's
// content-before-child-before-quiz tie-break. Reusing mapOrder (rather than a
// parallel copy) is what keeps this in permanent lockstep with the player.
const mergeByOrder = (contents, quizzes, children) => {
  const rows = [
    ...(contents || []).map((item) => ({ kind: "content", item })),
    ...(quizzes || []).map((item) => ({ kind: "quiz", item })),
    ...(children || []).map((item) => ({ kind: "child", item })),
  ];
  return rows.sort(mapOrder);
};

/**
 * The whole course's Content/Quiz leaves, flattened into the exact order the
 * player's courseUnits (lib/courseUnits.js) walks them: Course-direct first,
 * then each Module with its own content/quizzes interleaved (by `order`)
 * with its Lessons, each Lesson's own content/quizzes interleaved with its
 * Topics (or, with no Topics, just merged together), each Topic's own
 * content merged with its own quizzes. Built from the Progress roll-up's
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

  const noScope = { moduleId: null, lessonId: null, topicId: null };
  // Course level has no child containers — modules always follow every
  // course-direct item, regardless of order value (matches courseUnits.js).
  for (const row of mergeByOrder(hierarchy.contents, hierarchy.quizzes, [])) {
    pushLeaf(row.kind, row.item, noScope);
  }

  for (const mod of byOrder(hierarchy.modules)) {
    const moduleScope = { moduleId: mod.id, lessonId: null, topicId: null };

    for (const row of mergeByOrder(mod.contents, mod.quizzes, mod.lessons)) {
      if (row.kind !== "child") {
        pushLeaf(row.kind, row.item, moduleScope);
        continue;
      }

      const lesson = row.item;
      const lessonScope = { moduleId: mod.id, lessonId: lesson.id, topicId: null };
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
        const topicScope = { moduleId: mod.id, lessonId: lesson.id, topicId: topic.id };
        for (const topicRow of mergeByOrder(topic.contents, topic.quizzes, [])) {
          pushLeaf(topicRow.kind, topicRow.item, topicScope);
        }
      }
    }
  }

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
 *   lessonId: string|null, topicId: string|null}|null} null when progress
 *   data isn't available or the course has no trackable leaves at all.
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

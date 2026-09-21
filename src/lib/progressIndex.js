/**
 * Flattens the authoritative Progress hierarchy returned by
 * `GET /progress/courses/:courseId` into id-keyed lookups.
 *
 * The backend already computes every percentage and every completion flag —
 * bottom-up, in one transaction, over the same applicable-item set it derived
 * the course total from. Nothing here recomputes any of that: this module only
 * changes the SHAPE of the response (nested tree -> flat Maps) so a deeply
 * nested renderer can ask "is this id complete?" without walking the tree on
 * every row.
 *
 * Deriving completion in the frontend instead would let the sidebar disagree
 * with the course percentage shown two panels away, which is exactly what the
 * server-side roll-up exists to prevent.
 */

/**
 * Per-node roll-up, keyed by Course / Module / Lesson / Topic / SubTopic /
 * Concept id.
 *
 * `applicable` is the backend's own "this node has items that count" flag. It
 * is NOT the same as `totalItems > 0` for a Course, and callers should prefer
 * it over inventing an emptiness rule of their own.
 */
function nodeSummary(node) {
  return {
    id: node.id,
    title: node.title,
    completed: node.completed === true,
    // Skipped after passing this node's qualifying test. Deliberately NOT
    // folded into `completed`: skipped is not studied, and the distinction is
    // what lets the sidebar label it honestly.
    qualified: node.qualified === true,
    qualifiedAt: node.qualifiedAt ?? null,
    // The backend's single "this no longer stands in the student's way" flag:
    // completed, or qualified. Progression reads this; display reads the two
    // above.
    satisfied: node.satisfied === true || node.completed === true,
    progressPercent: node.progressPercent ?? 0,
    completedItems: node.completedItems ?? 0,
    totalItems: node.totalItems ?? 0,
    // The course root carries no `applicable` flag — it is applicable exactly
    // when it has any tracked item at all.
    applicable: node.applicable ?? (node.totalItems ?? 0) > 0,
  };
}

/**
 * @param {object|null|undefined} progressData
 *   The `data` payload of GET /progress/courses/:courseId.
 * @returns {{
 *   nodes: Map<string, object>,
 *   items: Map<string, object>,
 *   course: object|null,
 * }|null} `null` when progress is unavailable, so callers can render the
 *   learning experience unchanged rather than showing a misleading 0%.
 */
export function buildProgressIndex(progressData) {
  const hierarchy = progressData?.hierarchy;
  if (!hierarchy) return null;

  const nodes = new Map();
  const items = new Map();
  // Every item id owned by a node OR any of its descendants — lets
  // isNodeLeavable below check a Module/Lesson's full subtree without
  // re-walking the hierarchy itself.
  const nodeItemIds = new Map();

  // Direct (non-inherited) learning items owned by one node. Every item the
  // backend counts arrives pre-tagged with `kind` and `completed`.
  const indexDirectItems = (node) => {
    const ids = [];
    for (const item of [
      ...(node.contents || []),
      ...(node.quizzes || []),
      ...(node.assignments || []),
    ]) {
      if (item?.id) {
        items.set(item.id, item);
        ids.push(item.id);
      }
    }
    return ids;
  };

  // Post-order so a node's entry includes everything under it.
  const indexNode = (node) => {
    if (!node?.id) return [];
    let ids = indexDirectItems(node);
    for (const child of [
      ...(node.modules || []),
      ...(node.lessons || []),
      ...(node.topics || []),
      ...(node.subTopics || []),
      ...(node.concepts || []),
    ]) {
      ids = ids.concat(indexNode(child));
    }
    nodes.set(node.id, nodeSummary(node));
    nodeItemIds.set(node.id, ids);
    return ids;
  };

  indexNode(hierarchy);

  return { nodes, items, nodeItemIds, course: nodes.get(hierarchy.id) || nodeSummary(hierarchy) };
}

/** True only when the backend says this specific item is complete. */
export function isItemComplete(progressIndex, itemId) {
  if (!progressIndex || !itemId) return false;
  return progressIndex.items.get(itemId)?.completed === true;
}

/**
 * True once the student has submitted a Quiz — independent of `completed`,
 * which for a Quiz requires a PASSING submission. Lets the content player
 * allow moving past a quiz block on a bare attempt, while the Topic/Lesson/
 * Module crossing gate (canLeaveUnit, in the Learn page) still requires the
 * full roll-up completion — i.e. eventually passing — to leave that level.
 */
export function isItemSubmitted(progressIndex, itemId) {
  if (!progressIndex || !itemId) return false;
  const item = progressIndex.items.get(itemId);
  if (!item) return false;
  if (item.kind === "QUIZ") return item.attempted === true;
  if (item.kind === "ASSIGNMENT") {
    return Boolean(item.submissionStatus) && item.submissionStatus !== "NotSubmitted";
  }
  return isItemComplete(progressIndex, itemId);
}

/**
 * True when a student may cross out of this Concept/SubTopic/Topic/Lesson/
 * Module to the next one. Every item under it counts, direct or in a
 * descendant (so a Topic's SubTopic and Concept items count toward that
 * Topic). Every quiz under it only needs an
 * attempt on file, same as isItemSubmitted's quiz rule; a failed attempt no
 * longer blocks moving on. Non-quiz items (content, assignments) still need
 * their own `completed` flag, unchanged from before.
 */
export function isNodeLeavable(progressIndex, nodeId) {
  if (!progressIndex || !nodeId) return true;
  const summary = progressIndex.nodes.get(nodeId);
  if (!summary) return true;
  if (summary.applicable === false) return true;
  // A node the student qualified out of is behind them even though its items
  // were never touched — checked before the per-item sweep below, which would
  // otherwise refuse to let them past the very thing they earned the right to
  // skip. Every caller of this gate (the player's crossing check and the
  // course sidebar) therefore honours a skip without knowing about one.
  if (summary.satisfied === true) return true;

  const itemIds = progressIndex.nodeItemIds?.get(nodeId);
  if (!itemIds || itemIds.length === 0) return summary.completed === true;

  return itemIds.every((id) => {
    const item = progressIndex.items.get(id);
    if (item?.kind === "QUIZ") return item.attempted === true;
    return isItemComplete(progressIndex, id);
  });
}

/** The backend's roll-up for a Course/Module/Lesson/Topic/SubTopic/Concept id, or null. */
export function getNodeProgress(progressIndex, nodeId) {
  if (!progressIndex || !nodeId) return null;
  return progressIndex.nodes.get(nodeId) || null;
}

/**
 * Decorates a course tree (as returned by `useCourse` + `normalizeCourseHierarchy`)
 * with the backend's completion flags, so components that render from the course
 * tree show the same state as the ones reading the index directly.
 *
 * Returns the tree untouched when progress is unavailable.
 */
export function decorateCourseWithProgress(course, progressIndex) {
  if (!course || !progressIndex) return course;

  const withItem = (item) => ({
    ...item,
    completed: isItemComplete(progressIndex, item.id),
  });

  const withNode = (entity, extra = {}) => {
    const summary = getNodeProgress(progressIndex, entity.id);
    return {
      ...entity,
      completed: summary?.completed ?? false,
      progressPercent: summary?.progressPercent ?? 0,
      completedItems: summary?.completedItems ?? 0,
      totalItems: summary?.totalItems ?? 0,
      applicable: summary?.applicable ?? false,
      contents: (entity.contents || []).map(withItem),
      quizzes: (entity.quizzes || []).map(withItem),
      assignments: (entity.assignments || []).map(withItem),
      ...extra,
    };
  };

  return withNode(course, {
    modules: (course.modules || []).map((mod) =>
      withNode(mod, {
        lessons: (mod.lessons || []).map((lesson) =>
          withNode(lesson, {
            topics: (lesson.topics || []).map((topic) =>
              withNode(topic, {
                subTopics: (topic.subTopics || []).map((subTopic) =>
                  withNode(subTopic, {
                    concepts: (subTopic.concepts || []).map((concept) => withNode(concept)),
                  })
                ),
              })
            ),
          })
        ),
      })
    ),
  });
}

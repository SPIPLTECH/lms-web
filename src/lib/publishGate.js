/**
 * Publication preconditions for Module / Lesson / Topic.
 *
 * The original rule was "a Module needs a Lesson, a Lesson needs a Topic, a
 * Topic needs a Content" — written when Content could only hang off a Topic.
 * The course model now attaches Content, Quiz and Assignment directly at all
 * four levels, so a Module whose entire body is a direct Content (or a Quiz,
 * or an Assignment) satisfied none of those rules and could never be published
 * — leaving it permanently invisible to students with no way to fix it from
 * the UI.
 *
 * The guard itself is still worth keeping: publishing a genuinely empty node
 * shows students a dead end. So the rule becomes "has at least one child of
 * ANY publishable kind" rather than "has at least one child of one specific
 * kind".
 */

/**
 * Counts the learning items attached directly to one entity.
 *
 * Accepts either a loaded relation array or Prisma's `_count` aggregate, since
 * different callers fetch the entity at different depths.
 */
function countDirectLearningItems(entity) {
  if (!entity) return 0;

  const sizeOf = (relation, countKey) =>
    Array.isArray(relation) ? relation.length : entity._count?.[countKey] ?? 0;

  return (
    sizeOf(entity.contents, "contents") +
    sizeOf(entity.quizzes, "quizzes") +
    sizeOf(entity.assignments, "assignments")
  );
}

/**
 * Whether a Module/Lesson/Topic may be published.
 *
 * @param {number} structuralChildCount Lessons for a Module, Topics for a
 *   Lesson — the caller's existing count, kept so no consumer has to change.
 * @param {object|null} entity The entity being edited, used to pick up the
 *   direct Content/Quiz/Assignment the structural count doesn't see.
 */
export function canPublishEntity(structuralChildCount, entity) {
  return (structuralChildCount ?? 0) > 0 || countDirectLearningItems(entity) > 0;
}

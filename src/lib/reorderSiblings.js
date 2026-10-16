/**
 * Move Up/Down over ONE parent's learning sequence: its Content rows
 * (ordinary content, and the Content rows that place quizzes and assignments)
 * interleaved with its child containers (modules, lessons, topics, subtopics
 * or concepts) by their shared `order` — the API's contentOrder.util.js.
 *
 * A move swaps an item with its neighbour in that mixed list, whatever the
 * neighbour's type, and produces the parent's complete new order for
 * PATCH /contents/reorder ({ parentType, parentId, orderedIds }).
 */

/**
 * Sequence order: `order`, then Content before a child container on a legacy
 * tie, then creation time — the API's own tie-break, so the Course Map and the
 * server agree on what is adjacent.
 */
export function bySequenceOrder(a, b) {
  const orderA = a?.order ?? 0;
  const orderB = b?.order ?? 0;
  if (orderA !== orderB) return orderA - orderB;
  const rankA = a?.contentId ? 0 : 1;
  const rankB = b?.contentId ? 0 : 1;
  if (rankA !== rankB) return rankA - rankB;
  if (a?.createdAt && b?.createdAt) {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  }
  return 0;
}

/**
 * The id the API knows a sequence member by: its Content row for content,
 * quizzes and assignments (a quiz/assignment row's own `id` is the Quiz /
 * Assignment), its own id for a child container.
 */
export const sequenceMemberId = (row) => row?.contentId || row?.id || null;

/**
 * `memberIds` (the parent's whole sequence, in order) with `memberId` swapped
 * with its immediate neighbour in `direction` ("up" | "down"). null when there
 * is no neighbour that way, or `memberId` is not in the sequence.
 */
export function moveWithinSequence(memberIds, memberId, direction) {
  const index = memberId ? memberIds.indexOf(memberId) : -1;
  if (index === -1) return null;

  const neighborIndex = direction === "up" ? index - 1 : index + 1;
  if (neighborIndex < 0 || neighborIndex >= memberIds.length) return null;

  const next = [...memberIds];
  [next[index], next[neighborIndex]] = [next[neighborIndex], next[index]];
  return next;
}

/** The orders a complete new sequence gives its members: 1..n, as the API numbers them. */
export const sequenceOrders = (orderedIds) => orderedIds.map((id, index) => ({ id, order: index + 1 }));

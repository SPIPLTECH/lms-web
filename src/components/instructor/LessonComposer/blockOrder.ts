import type { ContentRow } from "./types";

/** Ascending by `order` — the Composer relies on this both to render blocks in sequence and to position new inserts against their neighbors. */
export function sortByOrder(contents: ContentRow[]): ContentRow[] {
  return [...contents].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export interface InsertPlan {
  /** The integer `order` the new block should be created with. */
  insertOrder: number;
}

/**
 * Plans where to insert a new block immediately above/below `anchorId`: the
 * `order` to create it with. Nothing is shifted from here — creating a block
 * at an occupied order makes the backend move every later item of the parent
 * down one, across all item types (Content, Quiz, Assignment and the child
 * Lesson/Topic/…), in one transaction. Those other types are not in
 * `contents`, so shifting Content rows client-side would land them on orders
 * the other types hold.
 *
 * Inserting below the last block resolves to anchor + 1.
 */
export function planInsert(
  contents: ContentRow[],
  anchorId: string,
  position: "above" | "below"
): InsertPlan {
  const sorted = sortByOrder(contents);
  const index = sorted.findIndex((c) => c.id === anchorId);

  if (index === -1) {
    const max = sorted.length ? Math.max(...sorted.map((c) => c.order ?? 0)) : 0;
    return { insertOrder: max + 1 };
  }

  // "below anchor" and "above the next block" are the same insertion point.
  const targetIndex = position === "above" ? index : index + 1;

  if (targetIndex >= sorted.length) {
    const anchorOrder = sorted[index].order ?? index + 1;
    return { insertOrder: anchorOrder + 1 };
  }

  return { insertOrder: sorted[targetIndex].order ?? targetIndex + 1 };
}

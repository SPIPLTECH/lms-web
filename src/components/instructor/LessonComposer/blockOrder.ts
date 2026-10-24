import type { ContentRow } from "./types";

/** Ascending by `order` — the Composer relies on this both to render blocks in sequence and to position new inserts against their neighbors. */
export function sortByOrder(contents: ContentRow[]): ContentRow[] {
  return [...contents].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export interface InsertPlan {
  /** The integer `order` the new block should be created with. */
  insertOrder: number;
}


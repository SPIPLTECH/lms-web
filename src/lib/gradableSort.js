/**
 * Ordering for the instructor's Grading & Results lists.
 *
 * Both tabs sort the same way off the same `lastSubmittedAt` field, which the
 * assignment, lesson-assignment and Final-test endpoints all return, so the
 * control behaves identically whichever tab it is used on.
 */

export const SORT_OPTIONS = [
  { key: "created", label: "Newest first" },
  { key: "recent", label: "Recently submitted" },
];

export const DEFAULT_SORT = "created";

export const isSortKey = (value) => SORT_OPTIONS.some((o) => o.key === value);

const time = (value) => {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
};

/**
 * Sorts a copy, newest submission first. Items nobody has submitted to sink to
 * the bottom rather than sorting as epoch-zero, and hold their original
 * relative order so the list below the active ones stays stable.
 *
 * Any key other than "recent" leaves the server's order untouched — that is
 * already newest-created-first.
 */
export function sortGradables(items = [], sortKey = DEFAULT_SORT) {
  if (sortKey !== "recent") return items;

  return items
    .map((item, index) => ({ item, index, at: time(item.lastSubmittedAt) }))
    .sort((a, b) => {
      if (a.at === b.at) return a.index - b.index;
      if (a.at === null) return 1;
      if (b.at === null) return -1;
      return b.at - a.at;
    })
    .map((entry) => entry.item);
}

/**
 * The "auto-open" protocol behind the Course Map's **Add Content** action.
 *
 * A click anywhere in the Course Map (Course, Module, Lesson, Topic, SubTopic
 * or Concept) switches the composer to that node and bumps a counter. The
 * LessonComposerPanel that mounts there watches the counter and opens its Add
 * Content picker. Two rules govern it, added at different times for different
 * bugs, and they used to cancel each other out:
 *
 *   1. The panel de-duplicates by VALUE (`handled === signal`) so the effect,
 *      which also re-runs whenever `isLoading` flips, opens the picker once
 *      per request rather than once per render.
 *   2. The parent RESETS the counter to 0 once consumed, so a value left over
 *      from an earlier click can't look "new" to the next fresh mount and
 *      re-open the picker on a revisit the instructor never asked for.
 *
 * Rule 1 assumes the counter never repeats a value; rule 2 guarantees it does.
 * A genuine new click therefore arrived wearing a number the panel had already
 * marked handled and was discarded as a repeat — and because a discarded click
 * never consumes, the counter stayed put and the NEXT click landed on a fresh
 * value and worked. Hence Add Content failing every other time.
 *
 * The reconciliation: 0 means "no request pending", which is precisely when
 * the marker is meaningless. Clearing it there lets the counter restart from 1
 * as often as it likes while rule 1 still holds within a single request.
 *
 * @param {object}  args
 * @param {number}  args.signal     current counter; 0 or less means no request
 * @param {boolean} args.isLoading  panel's content query still in flight
 * @param {number|null} args.handled marker from the previous run
 * @returns {{ open: boolean, handled: number|null }} whether to open the
 *   picker, and the marker to carry into the next run.
 */
export function resolveAutoOpen({ signal, isLoading, handled = null }) {
  // No request pending. Drop the marker: the next request may well reuse this
  // same number, and it must not be mistaken for the one we just handled.
  if (!signal || signal <= 0) return { open: false, handled: null };

  // Hold the request — the effect re-runs when loading finishes.
  if (isLoading) return { open: false, handled };

  // Already opened for this request; a re-render must not open it again.
  if (handled === signal) return { open: false, handled };

  return { open: true, handled: signal };
}

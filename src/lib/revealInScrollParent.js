/**
 * Scrolls the nearest scrolling ancestor just enough to bring `element` into
 * view — and only when it's actually out of view, so read-aloud highlighting
 * never makes the page jump while the current sentence is already visible.
 * Moves only that one scroller, never the whole page.
 */

function scrollParentOf(element) {
  for (let el = element?.parentElement; el; el = el.parentElement) {
    const { overflowY } = window.getComputedStyle(el);
    if ((overflowY === "auto" || overflowY === "scroll") && el.scrollHeight > el.clientHeight) return el;
  }
  return null;
}

/**
 * @param {Element} element
 * @param {{ topInset?: number, bottomInset?: number }} options
 *   Space to keep clear at the top/bottom of the scroller (e.g. for a sticky bar).
 */
export function revealInScrollParent(element, { topInset = 0, bottomInset = 24 } = {}) {
  if (typeof window === "undefined" || !element) return;
  const container = scrollParentOf(element);
  if (!container) return;
  const box = container.getBoundingClientRect();
  const rect = element.getBoundingClientRect();
  if (rect.top >= box.top + topInset && rect.bottom <= box.bottom - bottomInset) return;
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  container.scrollTo({
    top: container.scrollTop + (rect.top - box.top) - box.height / 3,
    behavior: reduceMotion ? "auto" : "smooth",
  });
}

"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * Keeps keyboard focus inside a control group whose buttons get swapped out —
 * e.g. Listen becoming Pause, Pause becoming Resume, or Stop returning to
 * Listen. Without this, the focused button unmounts and focus falls back to
 * <body>, so a keyboard or screen-reader user loses their place.
 *
 * When focus was inside `containerRef` and has just been dropped, it moves to
 * the element marked `data-focus-primary` (or the first enabled button).
 * Focus the user deliberately moved elsewhere is never pulled back.
 *
 * @param {React.RefObject<HTMLElement>} containerRef
 * @param {unknown[]} deps  Values whose change can swap the buttons.
 */
export default function useRetainFocus(containerRef, deps) {
  const focusInside = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const onFocusIn = () => {
      focusInside.current = true;
    };
    // A null relatedTarget means the focused element was removed (or the
    // window lost focus) — not that the user tabbed away.
    const onFocusOut = (event) => {
      if (event.relatedTarget && !el.contains(event.relatedTarget)) focusInside.current = false;
    };
    el.addEventListener("focusin", onFocusIn);
    el.addEventListener("focusout", onFocusOut);
    return () => {
      el.removeEventListener("focusin", onFocusIn);
      el.removeEventListener("focusout", onFocusOut);
    };
    // Re-attached when deps change, so a container that mounts late (after
    // speech support is detected) still gets its listeners.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, ...deps]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || !focusInside.current) return;
    const active = document.activeElement;
    if (active && el.contains(active)) return;
    if (active && active !== document.body) {
      focusInside.current = false;
      return;
    }
    const target = el.querySelector("[data-focus-primary]") || el.querySelector("button:not([disabled])");
    target?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

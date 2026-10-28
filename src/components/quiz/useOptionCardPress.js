"use client";

import { useRef } from "react";

// How far the pointer may travel between press and release and still count
// as a click rather than a drag.
const DRAG_TOLERANCE_PX = 6;

/**
 * Press handling for an answer option that holds code, which is a card
 * (role="button") rather than a <button>: the code inside has to scroll
 * sideways and be selectable, and a <button> swallows both. A press picks
 * the option only when it was a click: dragging along the code (scrolling,
 * selecting text) never does. Enter and Space pick it from the keyboard,
 * as a <button> would.
 *
 * Returns a function giving one card's props: `cardPress(() => pick())`.
 */
export default function useOptionCardPress() {
  const pressStart = useRef(null);

  return (onPress) => ({
    role: "button",
    tabIndex: 0,
    onPointerDown: (event) => {
      pressStart.current = { x: event.clientX, y: event.clientY };
    },
    onClick: (event) => {
      const start = pressStart.current;
      pressStart.current = null;
      if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > DRAG_TOLERANCE_PX) return;
      const selection = window.getSelection?.();
      if (selection && !selection.isCollapsed && event.currentTarget.contains(selection.anchorNode)) return;
      onPress();
    },
    onKeyDown: (event) => {
      if (event.target !== event.currentTarget) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onPress();
      }
    },
  });
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A drag-resizable width for a left-hand panel (the Course Map), remembered
 * per browser. Long node names truncate at a fixed width, so users widen the
 * panel instead of hovering every row.
 *
 * Returns the current width and the props for a vertical separator placed on
 * the panel's right edge (see components/ui/ResizeHandle.jsx):
 *   - drag with mouse/pen/touch (pointer capture, so it keeps tracking
 *     outside the 6px handle);
 *   - ArrowLeft/ArrowRight nudge by 16px, Home/End jump to min/max;
 *   - double-click resets to the default.
 *
 * The stored width is read after mount, not during render, so the server
 * render and the first client render agree (no hydration mismatch).
 *
 * @param {object} options
 * @param {string} options.storageKey  localStorage key for this panel
 * @param {number} [options.defaultWidth=320]
 * @param {number} [options.minWidth=260]
 * @param {number} [options.maxWidth=560]
 */
export default function useResizableWidth({ storageKey, defaultWidth = 320, minWidth = 260, maxWidth = 560 }) {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const drag = useRef(null);

  const clamp = useCallback((value) => Math.min(maxWidth, Math.max(minWidth, Math.round(value))), [minWidth, maxWidth]);

  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(storageKey));
      if (saved) setWidth(clamp(saved));
    } catch {
      // Storage blocked (private mode, disabled site data): keep the default.
    }
  }, [storageKey, clamp]);

  const commit = useCallback(
    (value) => {
      const next = clamp(value);
      setWidth(next);
      try {
        localStorage.setItem(storageKey, String(next));
      } catch {
        // Not remembered this time; the width still applies for this visit.
      }
    },
    [clamp, storageKey]
  );

  const onPointerDown = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { startX: event.clientX, startWidth: width, latest: width };
    setIsResizing(true);
  };

  const onPointerMove = (event) => {
    if (!drag.current) return;
    const next = clamp(drag.current.startWidth + event.clientX - drag.current.startX);
    drag.current.latest = next;
    setWidth(next);
  };

  const endDrag = () => {
    if (!drag.current) return;
    commit(drag.current.latest);
    drag.current = null;
    setIsResizing(false);
  };

  const onKeyDown = (event) => {
    const step = { ArrowLeft: -16, ArrowRight: 16 }[event.key];
    if (step) {
      event.preventDefault();
      commit(width + step);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      commit(event.key === "Home" ? minWidth : maxWidth);
    }
  };

  // While dragging, the page must not select text or show the I-beam.
  useEffect(() => {
    if (!isResizing) return undefined;
    const { cursor, userSelect } = document.body.style;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.body.style.cursor = cursor;
      document.body.style.userSelect = userSelect;
    };
  }, [isResizing]);

  const handleProps = {
    role: "separator",
    "aria-orientation": "vertical",
    "aria-valuenow": width,
    "aria-valuemin": minWidth,
    "aria-valuemax": maxWidth,
    tabIndex: 0,
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onKeyDown,
    onDoubleClick: () => commit(defaultWidth),
  };

  return { width, isResizing, handleProps };
}

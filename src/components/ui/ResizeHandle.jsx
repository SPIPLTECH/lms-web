"use client";

/**
 * The draggable right edge of a resizable panel. Pair with
 * hooks/useResizableWidth, spreading its `handleProps` here; the parent must
 * be `relative`. It sits just inside the parent's right edge, so a parent with
 * overflow-hidden (needed to clip a collapsing panel) does not hide it. A thin
 * line that turns the theme colour on hover, focus and while dragging — the
 * hit area is wider than the line so it is easy to grab.
 */
export default function ResizeHandle({ handleProps, isResizing, label = "Resize panel", className = "" }) {
  return (
    <div
      {...handleProps}
      aria-label={label}
      title={`${label} — drag, or double-click to reset`}
      className={`group absolute inset-y-0 right-0 z-20 w-2 cursor-col-resize touch-none outline-none ${className}`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 rounded-full transition-colors ${
          isResizing ? "bg-primary" : "bg-transparent group-hover:bg-primary/60 group-focus-visible:bg-primary"
        }`}
      />
    </div>
  );
}

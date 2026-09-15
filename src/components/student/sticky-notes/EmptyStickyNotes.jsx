"use client";

// `compact` is the phone presentation used inside the Learn Page's "More"
// popover, where this empty state sits in a ~280px card that must not turn
// into a wall of blank space. Same copy and structure either way — only the
// icon, type scale and vertical rhythm shrink. Default false, so the
// desktop side panel renders exactly as before.
export default function EmptyStickyNotes({ compact = false }) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-transparent text-center ${
        compact ? "py-5" : "py-12"
      }`}
    >
      <div className={compact ? "mb-1.5 text-2xl" : "mb-4 text-5xl"}>
        📝
      </div>

      <h3 className={`font-semibold text-foreground ${compact ? "text-sm" : "text-lg"}`}>
        No Sticky Notes Yet
      </h3>

      <p
        className={`text-muted-foreground ${
          compact ? "mt-1 max-w-[15rem] text-[11px] leading-snug" : "mt-2 max-w-sm text-sm"
        }`}
      >
        Create your first sticky note while learning.
        Save important concepts, interview questions,
        or reminders for later.
      </p>
    </div>
  );
}

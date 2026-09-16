"use client";

import { useState } from "react";

import { useCreateStickyNote } from "@/hooks/queries/student/useCreateStickyNote";

import { STICKY_NOTE_COLORS } from "@/constants/stickyNoteColors";
import { formatDuration } from "@/utils/formatDuration";

// `compact` is the phone presentation used inside the Learn Page's "More"
// popover. Every control stays — same colours, same timestamp, same Add
// Note submit — only the swatch size, padding and type scale shrink so the
// form fits a ~280px card. Default false leaves the desktop panel as it was.
export default function CreateStickyNoteForm({
  lessonId,
  currentTimestamp = 0,
  compact = false
}) {
  const [content, setContent] =
    useState("");

  const [color, setColor] =
    useState("yellow");

  const {
    mutate: createStickyNote,
    isPending
  } = useCreateStickyNote();

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!content.trim()) {
      return;
    }

    createStickyNote(
      {
        lessonId,
        content: content.trim(),
        color,
        timestamp: currentTimestamp
      },
      {
        onSuccess: () => {
          setContent("");
          setColor("yellow");
        }
      }
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={compact ? "space-y-2.5" : "space-y-4"}
    >
      <textarea
        value={content}
        onChange={(e) =>
          setContent(e.target.value)
        }
        rows={compact ? 3 : 4}
        placeholder="Write a sticky note..."
        className={`w-full rounded-lg border border-transparent bg-background text-foreground outline-none focus:border-primary ${
          compact ? "p-2.5 text-[13px]" : "p-3 text-sm"
        }`}
      />

      <div
        className={`flex flex-wrap items-center justify-between ${
          compact ? "gap-2" : "gap-3"
        }`}
      >
        <div className={`flex items-center ${compact ? "gap-1.5" : "gap-2"}`}>
          {STICKY_NOTE_COLORS.map((item) => (
            <button
              key={item.name}
              type="button"
              onClick={() =>
                setColor(item.name)
              }
              aria-label={`${item.name} note colour`}
              aria-pressed={color === item.name}
              className={`rounded-full border-2 transition ${
  compact ? "h-6 w-6" : "h-8 w-8"
} ${
  color === item.name
    ? "border-white"
    : "border-transparent"
} ${item.className}`}
            />
          ))}
        </div>

        <div className={`flex items-center ${compact ? "gap-2" : "gap-3"}`}>
          <span
            className={`text-muted-foreground ${
              compact ? "text-[11px]" : "text-xs"
            }`}
          >
           {compact ? "" : "Timestamp: "}{formatDuration(currentTimestamp)}
          </span>

          <button
            type="submit"
            disabled={
              isPending ||
              !content.trim()
            }
            className={`rounded-lg bg-primary font-medium text-foreground transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60 ${
              compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
            }`}
          >
            {isPending
              ? "Saving..."
              : "Add Note"}
          </button>
        </div>
      </div>
    </form>
  );
}
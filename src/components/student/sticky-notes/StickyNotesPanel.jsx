"use client";

import CreateStickyNoteForm from "./CreateStickyNoteForm";
import EmptyStickyNotes from "./EmptyStickyNotes";
import StickyNoteCard from "./StickyNoteCard";

import { useStickyNotes } from "@/hooks/queries/student/useStickyNotes";

// `compact` is the phone presentation used inside the Learn Page's "More"
// popover: tighter padding and type, no descriptive subtitle, and no inner
// scroll region — the popover already scrolls, and nesting a second
// scroller inside it makes the note list awkward to reach on touch.
// Behaviour, data and every control are unchanged; default false leaves the
// desktop side panel exactly as it was.
export default function StickyNotesPanel({
  lessonId,
  currentTimestamp = 0,
  onSeek,
  compact = false,
}) {
  const {
    data: stickyNotes = [],
    isLoading,
    isError,
  } = useStickyNotes(lessonId);

  if (!lessonId) {
    return null;
  }

  return (
    <div
      className={`border border-[#1e2030] bg-[#0d0e16]/60 backdrop-blur-md shadow-xl ${
        compact ? "rounded-2xl p-3" : "rounded-3xl p-5"
      }`}
    >
      <div className={`flex items-center justify-between ${compact ? "mb-2.5" : "mb-4"}`}>
        <div>
          <h2
            className={`font-black text-foreground uppercase tracking-wider flex items-center gap-2 ${
              compact ? "text-[13px]" : "text-sm"
            }`}
          >
            <span>📌 Sticky Notes</span>
          </h2>
          {!compact && (
            <p className="mt-0.5 text-[11px] text-muted-foreground font-semibold">
              Timestamped notes anchored to video playback.
            </p>
          )}
        </div>
      </div>

      <CreateStickyNoteForm
        lessonId={lessonId}
        currentTimestamp={currentTimestamp}
        compact={compact}
      />

      <div className={compact ? "mt-3" : "mt-5"}>
        {isLoading ? (
          <div
            className={`text-center text-xs font-semibold text-muted-foreground ${
              compact ? "py-4" : "py-8"
            }`}
          >
            Loading notes...
          </div>
        ) : isError ? (
          <div
            className={`text-center text-xs font-semibold text-red-400 ${
              compact ? "py-4" : "py-8"
            }`}
          >
            Failed to load sticky notes.
          </div>
        ) : stickyNotes.length === 0 ? (
          <EmptyStickyNotes compact={compact} />
        ) : (
          <div
            className={
              compact
                ? "space-y-2"
                : "space-y-3 max-h-96 overflow-y-auto pr-1 scrollbar-thin"
            }
          >
            {stickyNotes.map((note) => (
              <StickyNoteCard
                key={note.id}
                note={note}
                lessonId={lessonId}
                onSeek={onSeek}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
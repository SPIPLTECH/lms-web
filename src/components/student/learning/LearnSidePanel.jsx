"use client";

import { ChevronDown, HelpCircle, StickyNote } from "lucide-react";

import AskInstructorCard from "@/components/student/learning/AskInstructorCard";
import StickyNotesPanel from "@/components/student/sticky-notes/StickyNotesPanel";

// The learning workspace's side panel: each button shows or hides its own
// feature below. One section is open at a time (the column is narrow);
// clicking the open one collapses it.
const FEATURES = [
  { id: "ask", label: "Ask instructor", icon: HelpCircle },
  { id: "notes", label: "Sticky notes", icon: StickyNote },
];

/**
 * `activeFeature` / `onChangeFeature` are owned by the learn page, so the
 * header's Notes button can open the panel straight onto Sticky notes.
 * `null` means every section is collapsed.
 *
 * `compact` is the phone presentation: this same panel is what the Learn
 * Page's mobile "More" popover shows, where it has ~280px instead of the
 * desktop column's 360px. It only shrinks spacing and type — the sections,
 * state and handlers are identical on both surfaces.
 */
export default function LearnSidePanel({
  activeFeature,
  onChangeFeature,
  lessonId,
  askTarget,
  currentTimestamp,
  onSeek,
  compact = false,
}) {
  const toggle = (id) => onChangeFeature(activeFeature === id ? null : id);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Learning tools">
        {FEATURES.map(({ id, label, icon: Icon }) => {
          const isOpen = activeFeature === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggle(id)}
              aria-expanded={isOpen}
              aria-controls={`learn-side-${id}`}
              className={`flex min-h-[44px] items-center gap-2 rounded-xl border px-3 text-left text-base font-semibold transition-colors cursor-pointer ${
                isOpen
                  ? "border-primary/60 bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:border-primary/40 hover:text-primary"
              }`}
            >
              <Icon size={16} className="shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{label}</span>
              <ChevronDown
                size={14}
                aria-hidden
                className={`shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
          );
        })}
      </div>

      {activeFeature && (
        <div id={`learn-side-${activeFeature}`} role="region" aria-label={FEATURES.find((f) => f.id === activeFeature)?.label}>
          {activeFeature === "ask" && <AskInstructorCard inline lessonId={lessonId} target={askTarget} />}

          {activeFeature === "notes" && (
            <StickyNotesPanel
              lessonId={lessonId}
              currentTimestamp={currentTimestamp}
              onSeek={onSeek}
              compact={compact}
            />
          )}
        </div>
      )}
    </div>
  );
}

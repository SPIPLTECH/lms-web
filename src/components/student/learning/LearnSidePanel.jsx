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
 * Page's mobile "Learning tools" sheet shows, where it has a phone's width
 * instead of the desktop column's 360px. It only shrinks spacing and type —
 * the sections, state and handlers are identical on both surfaces.
 *
 * `tabs` swaps the accordion for two tabs (the mobile sheet): one feature is
 * always shown, and choosing a tab never collapses it.
 */
export default function LearnSidePanel({
  activeFeature,
  onChangeFeature,
  lessonId,
  askTarget,
  currentTimestamp,
  onSeek,
  compact = false,
  tabs = false,
}) {
  const toggle = (id) => onChangeFeature(activeFeature === id ? null : id);

  const renderFeature = (id) =>
    id === "ask" ? (
      <AskInstructorCard inline lessonId={lessonId} target={askTarget} />
    ) : (
      <StickyNotesPanel lessonId={lessonId} currentTimestamp={currentTimestamp} onSeek={onSeek} compact={compact} />
    );

  if (tabs) {
    const shown = activeFeature ?? FEATURES[0].id;
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div
          className="grid shrink-0 grid-cols-2 gap-1 rounded-xl border border-border bg-background p-1"
          role="tablist"
          aria-label="Learning tools"
        >
          {FEATURES.map(({ id, label, icon: Icon }) => {
            const isShown = shown === id;
            return (
              <button
                key={id}
                id={`learn-tab-${id}`}
                type="button"
                role="tab"
                aria-selected={isShown}
                aria-controls={`learn-side-${id}`}
                onClick={() => onChangeFeature(id)}
                className={`flex min-h-[40px] items-center justify-center gap-2 rounded-lg px-2 text-sm font-bold transition-colors cursor-pointer ${
                  isShown ? "bg-primary text-slate-950" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={16} className="shrink-0" aria-hidden />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>

        <div
          id={`learn-side-${shown}`}
          role="tabpanel"
          aria-labelledby={`learn-tab-${shown}`}
          className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          {renderFeature(shown)}
        </div>
      </div>
    );
  }

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
          {renderFeature(activeFeature)}
        </div>
      )}
    </div>
  );
}

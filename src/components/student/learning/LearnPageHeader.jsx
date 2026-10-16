"use client";

import { PanelLeftOpen, MoreHorizontal } from "lucide-react";

// Sticky sub-header for the learning workspace — course-map toggle, the
// lesson/topic currently playing in the content player, and the Sticky
// Notes trigger. The shared dashboard Navbar (logo/nav/search/chat/
// notifications/profile) already renders above this on every Student page,
// including this one, so this stays scoped to what's unique to the
// immersive learning workspace instead of duplicating those controls.
export default function LearnPageHeader({
  courseSidebarOpen,
  onOpenSidebar,
  selectedLesson,
  // Title of the most specific level the player is in (a Topic, SubTopic or
  // Concept) and that level's name — one line, never a breadcrumb stack.
  topicTitle,
  levelLabel = "Topic",
  course,
  // No progress readout here: the Course Map already reports progress at every
  // level (course, module, lesson, topic, subtopic, concept), so repeating the
  // current level's percentage beside the More button only said again, less
  // precisely, what the map shows in context.
  // The right-hand side panel (Ask Instructor / Sticky Notes / Feedback).
  // These names must match what the learn page passes — a mismatch here
  // left the button with no click handler, so it silently did nothing.
  isStickyNotesOpen = false,
  onToggleStickyNotes,
}) {
  return (
    <header className="max-sm:hidden sticky top-0 bg-[#07080f]/80 backdrop-blur-md border-b border-border py-3 max-xl:py-2 px-4 sm:px-6 flex items-center justify-between z-30 select-none">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {!courseSidebarOpen && (
          <button
            type="button"
            onClick={onOpenSidebar}
            className="hidden xl:flex shrink-0 h-9 w-9 items-center justify-center rounded-full border border-primary/50 bg-background text-primary shadow-md transition hover:bg-primary/10 hover:border-primary hover:text-orange-300 cursor-pointer"
            aria-label="Show course map"
            title="Show course map"
          >
            <PanelLeftOpen size={16} />
          </button>
        )}
        <div className="hidden xl:block min-w-0">
          <span className="text-[12px] font-black uppercase tracking-widest text-muted-foreground truncate block">
            LEARNING WORKSPACE
          </span>
          <h2 className="text-base font-bold text-foreground truncate">
            {selectedLesson ? `Lesson: ${selectedLesson.title}` : course?.title || "Course Overview"}
          </h2>
          {topicTitle && (
            <p className="text-sm text-muted-foreground truncate">{levelLabel}: {topicTitle}</p>
          )}
        </div>
      </div>

      {/* Side-panel toggle. globals.css gives every <button> an unlayered
          border-radius / box-shadow / transition that beats Tailwind
          utilities, so the pill radius and transition are set inline and the
          gradient ring + glow live on inner spans the rule doesn't touch. */}
      <button
        type="button"
        onClick={onToggleStickyNotes}
        aria-pressed={isStickyNotesOpen}
        style={{ borderRadius: 9999, transition: "transform 150ms ease" }}
        className="group relative shrink-0 p-px cursor-pointer bg-gradient-to-br from-primary/80 via-border to-accent/60 motion-safe:active:scale-95 max-xl:hidden"
        title={isStickyNotesOpen ? "Hide side panel" : "Show side panel"}
        aria-label={isStickyNotesOpen ? "Hide side panel" : "Show side panel"}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute -inset-1 rounded-full bg-primary/40 blur-md transition-opacity duration-300 ${
            isStickyNotesOpen ? "opacity-70" : "opacity-0 group-hover:opacity-60"
          }`}
        />
        <span
          className={`relative flex h-9 items-center gap-2 rounded-full px-3 sm:px-3.5 text-sm font-bold tracking-wide transition-colors duration-200 ${
            isStickyNotesOpen
              ? "bg-primary text-primary-foreground"
              : "bg-background text-foreground/80 group-hover:text-foreground"
          }`}
        >
          <MoreHorizontal
            size={15}
            className={`transition-transform duration-300 motion-safe:group-hover:-rotate-12 motion-safe:group-hover:scale-110 ${
              isStickyNotesOpen ? "" : "text-primary"
            }`}
          />
          <span className="hidden sm:inline">More</span>
        </span>
      </button>
    </header>
  );
}

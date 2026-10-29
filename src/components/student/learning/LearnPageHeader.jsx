"use client";

import { PanelLeftOpen, MoreHorizontal } from "lucide-react";

import EvaluatorFeedbackButton from "@/components/evaluator/EvaluatorFeedbackButton";

// Sub-header for the learning workspace — the lesson/topic currently playing
// in the content player and the Sticky Notes trigger. The shared
// dashboard Navbar (logo/nav/search/chat/notifications/profile) already
// renders above this on every Student page, including this one, so this
// stays scoped to what's unique to the immersive learning workspace instead
// of duplicating those controls.
export default function LearnPageHeader({
  // The learn page's single workspace-collapse state (desktop): set by the
  // inactivity timer or by the Course Map's own hide button, and the header
  // looks the same either way. Collapsing is vertical — the row animates to
  // zero height. No toggle of its own: it follows the Course Map.
  collapsed = false,
  // Reopens the Course Map and this header together (the restore tab).
  onExpand,
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
    <>
      {/* 1fr <-> 0fr on a one-row grid is a real height animation to and from
          the content's natural height: collapsed, the row is 0px tall (border
          included), so nothing below is held down by an empty band. `inert`
          takes the hidden controls out of the tab order and the a11y tree.
          data-learn-chrome: the pointer or focus resting here keeps the
          idle timer from hiding it. */}
      <div
        data-learn-chrome=""
        className={`max-sm:hidden shrink-0 relative z-30 grid transition-[grid-template-rows] duration-300 ease-in-out ${
          collapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
        }`}
      >
        <div className="min-h-0 overflow-hidden" inert={collapsed}>
          <header
            className="bg-[#07080f]/80 backdrop-blur-md border-b border-border py-3 max-xl:py-2 px-4 sm:px-6 flex items-center justify-between select-none"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
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

            <div className="flex shrink-0 items-center gap-3">
            {/* Evaluator accounts only: the independent evaluation feedback
                site (not the LMS Feedback panel behind More). */}
            <EvaluatorFeedbackButton />

            {/* Side-panel toggle. globals.css gives every <button> an unlayered
                border-radius / box-shadow / transition that beats Tailwind
                utilities, so the pill radius and transition are set inline and the
                gradient ring + glow live on inner spans the rule doesn't touch. */}
            <button
              type="button"
              onClick={onToggleStickyNotes}
              aria-pressed={isStickyNotesOpen}
              data-tour="more"
              data-tour-tap="Tap More"
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
            </div>
          </header>
        </div>
      </div>

      {/* RESTORE — the Course Map toggle's collapsed form: the rail is 0px
          wide, so its own hide button is gone with it, and this is how the
          student clicks it "again". Shown whenever the layout is collapsed,
          by the timer or by hand, so both collapsed layouts are identical. Fixed to the
          left edge where the rail slides back out, so it takes no space from
          the content. Same inline radius escape hatch as the More pill. */}
      {collapsed && (
        <button
          type="button"
          onClick={onExpand}
          style={{ borderRadius: "0 10px 10px 0" }}
          className="hidden xl:flex fixed left-0 top-1/2 -translate-y-1/2 z-30 h-14 w-5 items-center justify-center border border-l-0 border-primary/50 bg-background text-primary shadow-md transition hover:w-7 hover:bg-primary/10 hover:border-primary hover:text-orange-300 focus-visible:w-7 cursor-pointer"
          aria-label="Show course map and workspace header"
          title="Show course map and workspace header"
        >
          <PanelLeftOpen size={14} aria-hidden="true" />
        </button>
      )}
    </>
  );
}

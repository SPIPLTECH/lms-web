"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileStack,
  GitBranch,
  HelpCircle,
  Home,
  Layers,
  Lightbulb,
  Lock,
  PanelLeftClose,
} from "lucide-react";

import { NodeBadge } from "@/components/student/learning/CourseContentAccordion";
import {
  CONTENT_TYPE_META,
  DEFAULT_CONTENT_META,
  getQuizTagStyle,
} from "@/components/instructor/courses/CourseComposerSidebar";

/**
 * The student's Course Map, drawn from THE learning sequence
 * (GET /progress/learning-sequence) — the same steps the player's Prev/Next
 * walks, in the same order, with the server's own completed/locked flags.
 * The map never orders, merges or gates anything itself, so it cannot show a
 * different course than the one the student is stepping through.
 *
 * Containers (Module, Lesson, Topic, SubTopic, Concept) open to their entries:
 * the container's steps and child containers in sequence order. Clicking a
 * container goes to its first step; clicking a step goes to that step. Locked
 * steps are shown, not hidden, and the page decides what a click on one does.
 */

const LEVEL_META = {
  MODULE: { icon: Layers, prefix: "M", text: "text-base font-bold" },
  LESSON: { icon: BookOpen, prefix: "L", text: "text-[15px] font-semibold" },
  TOPIC: { icon: FileStack, prefix: "T", text: "text-[14.5px] font-semibold" },
  SUBTOPIC: { icon: GitBranch, prefix: "S", text: "text-[14.5px] font-medium" },
  CONCEPT: { icon: Lightbulb, prefix: "C", text: "text-[14.5px] font-medium" },
};

/** Every container id on the path from the course down to step `index`. */
function ancestorIds(tree, index) {
  const path = [];
  const walk = (node, trail) => {
    for (const entry of node.entries) {
      if (entry.type === "step" && entry.stepIndex === index) {
        path.push(...trail);
        return true;
      }
      if (entry.type === "container" && walk(entry.node, [...trail, entry.node.id])) return true;
    }
    return false;
  };
  if (tree) walk(tree, []);
  return new Set(path);
}

function StepRow({ step, isActive, onSelect, rowRef }) {
  const isQuiz = step.kind === "QUIZ";
  const isAssignment = step.kind === "ASSIGNMENT";
  const tagStyle = isQuiz ? getQuizTagStyle(step.quizTag) : null;
  const meta = CONTENT_TYPE_META[step.type] || DEFAULT_CONTENT_META;
  const Icon = isQuiz ? HelpCircle : isAssignment ? ClipboardList : meta.icon;
  const label = isQuiz ? tagStyle.label : isAssignment ? "Assignment" : meta.label;

  const tone = step.locked
    ? "text-muted-foreground/70 hover:bg-background/40"
    : isActive
      ? isQuiz
        ? tagStyle.active
        : isAssignment
          ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 font-semibold"
          : "bg-primary/15 text-primary font-semibold"
      : isQuiz
        ? tagStyle.idle
        : isAssignment
          ? "text-yellow-700 dark:text-yellow-400 hover:bg-background/60"
          : "text-foreground hover:text-slate-50 hover:bg-background/70";

  const iconTone = step.locked
    ? "text-muted-foreground/70"
    : isQuiz
      ? tagStyle.icon
      : isAssignment
        ? "text-yellow-700 dark:text-yellow-400"
        : isActive
          ? "text-primary"
          : meta.color;

  return (
    <div
      ref={rowRef}
      role="button"
      tabIndex={0}
      aria-current={isActive ? "step" : undefined}
      aria-disabled={step.locked || undefined}
      onClick={() => onSelect(step.index)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(step.index);
        }
      }}
      title={`${step.title || label} — ${label}${step.locked ? " (locked)" : ""}`}
      className={`flex items-center justify-between gap-2 pl-2 pr-1 py-1.5 rounded-lg cursor-pointer transition-colors ${tone}`}
    >
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <Icon size={12} className={`shrink-0 ${iconTone}`} />
        <span className="truncate text-[14.5px] leading-snug">{step.title || `Untitled ${label}`}</span>
      </div>
      <span className="shrink-0 flex items-center">
        {step.locked ? (
          <Lock size={12} className="text-muted-foreground/70" aria-label="Locked" />
        ) : step.completed ? (
          <CheckCircle2 size={13} className="text-emerald-500" aria-label="Completed" />
        ) : null}
      </span>
    </div>
  );
}

function ContainerNode({ node, numbering, steps, currentStepIndex, openIds, onToggle, onSelectStep, activeRowRef }) {
  const meta = LEVEL_META[node.kind] || LEVEL_META.TOPIC;
  const Icon = meta.icon;
  const open = openIds.has(node.id);
  const containsActive =
    node.firstStepIndex !== null &&
    currentStepIndex >= node.firstStepIndex &&
    currentStepIndex <= node.lastStepIndex;

  let childNumber = 0;
  return (
    <div>
      <div
        className={`flex items-center justify-between gap-1.5 pl-1 pr-1 py-1.5 rounded-lg transition-colors border-l-2 cursor-pointer ${
          containsActive ? "bg-background/40 border-primary/40" : "border-transparent hover:bg-background/60"
        } ${node.locked ? "text-muted-foreground" : "text-foreground"}`}
        onClick={() => {
          if (node.firstStepIndex !== null) onSelectStep(node.firstStepIndex);
          else onToggle(node.id);
        }}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggle(node.id);
            }}
            className="p-0.5 text-muted-foreground hover:text-slate-50 transition cursor-pointer shrink-0"
            aria-label={open ? `Collapse ${node.title}` : `Expand ${node.title}`}
            aria-expanded={open}
          >
            <ChevronRight size={14} className={`transition-transform duration-200 ${open ? "rotate-90 text-primary" : ""}`} />
          </button>
          {node.locked ? (
            <Lock size={14} className="shrink-0 text-muted-foreground" />
          ) : (
            <Icon size={14} className="shrink-0 text-primary/80" />
          )}
          <span className="text-[13px] font-black text-muted-foreground tabular-nums shrink-0">
            {meta.prefix}
            {numbering}
          </span>
          <span className={`truncate ${meta.text}`} title={node.title}>
            {node.title}
          </span>
          <NodeBadge node={node} />
        </div>
      </div>

      {open && (
        <div className="ml-3.5 pl-3 py-0.5 space-y-0.5 border-l border-border/70">
          {node.entries.length === 0 && (
            <div className="py-1.5 px-2 text-[14px] text-muted-foreground italic">Nothing here yet.</div>
          )}
          {node.entries.map((entry) => {
            if (entry.type === "step") {
              const step = steps[entry.stepIndex];
              if (!step) return null;
              const isActive = entry.stepIndex === currentStepIndex;
              return (
                <StepRow
                  key={`step-${step.contentId}`}
                  step={step}
                  isActive={isActive}
                  onSelect={onSelectStep}
                  rowRef={isActive ? activeRowRef : undefined}
                />
              );
            }
            childNumber += 1;
            return (
              <ContainerNode
                key={`${entry.node.kind}-${entry.node.id}`}
                node={entry.node}
                numbering={childNumber}
                steps={steps}
                currentStepIndex={currentStepIndex}
                openIds={openIds}
                onToggle={onToggle}
                onSelectStep={onSelectStep}
                activeRowRef={activeRowRef}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function StudentCourseMap({
  sequence,
  currentStepIndex,
  onSelectStep,
  onSelectCourseOverview,
  onToggleOpen,
  hideHeader = false,
}) {
  const tree = sequence?.tree || null;
  const steps = sequence?.steps || [];

  // Containers the student opened or closed by hand; the path down to the
  // current step is always open on top of these.
  const [toggled, setToggled] = useState(() => new Map());
  const currentPath = useMemo(() => ancestorIds(tree, currentStepIndex), [tree, currentStepIndex]);
  const openIds = useMemo(() => {
    const ids = new Set(currentPath);
    for (const [id, isOpen] of toggled) {
      if (isOpen) ids.add(id);
      else ids.delete(id);
    }
    return ids;
  }, [currentPath, toggled]);

  // Moving to a new step re-opens its path even if the student closed it.
  useEffect(() => {
    setToggled((previous) => {
      let changed = false;
      const next = new Map(previous);
      for (const id of currentPath) {
        if (next.get(id) === false) {
          next.delete(id);
          changed = true;
        }
      }
      return changed ? next : previous;
    });
  }, [currentPath]);

  const toggle = (id) =>
    setToggled((previous) => {
      const next = new Map(previous);
      next.set(id, !openIds.has(id));
      return next;
    });

  const activeRowRef = useRef(null);
  useEffect(() => {
    activeRowRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [currentStepIndex]);

  let childNumber = 0;
  return (
    <aside className="sidebar-panel rounded-2xl border border-border bg-background p-4 shadow-xl flex flex-col h-full max-h-full lg:max-h-full overflow-hidden text-foreground">
      {!hideHeader && (
        <>
          <div className="flex items-center justify-between gap-2 mb-1 shrink-0">
            <div className="font-black text-base uppercase tracking-widest text-foreground flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary-accent, #f97316)" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
              <span>Course Map</span>
            </div>
            <button
              type="button"
              onClick={onToggleOpen}
              className="p-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-background transition cursor-pointer shrink-0"
              aria-label="Hide course map"
              title="Hide course map"
            >
              <PanelLeftClose size={16} />
            </button>
          </div>
          <div className="text-[14.5px] text-muted-foreground mb-3 pb-3 border-b border-border/80">
            {sequence?.progress
              ? `${sequence.progress.completedItems} of ${sequence.progress.totalItems} complete`
              : "Course structure"}
          </div>
        </>
      )}

      <div
        className="flex items-center gap-2 px-3 py-2.5 mb-1 rounded-xl transition cursor-pointer text-base border-l-[3px] border-transparent text-foreground hover:bg-background shrink-0"
        onClick={onSelectCourseOverview}
      >
        <Home size={14} className="text-muted-foreground shrink-0" />
        <span className="truncate font-semibold flex-1">Course Overview</span>
        {tree && <NodeBadge node={tree} />}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto -mr-1 pr-1 space-y-0.5">
        {!tree ? (
          <div className="py-1.5 px-2 text-[14px] text-muted-foreground">Loading course map…</div>
        ) : tree.entries.length === 0 ? (
          <div className="py-1.5 px-2 text-[14px] text-muted-foreground italic">This course has no content yet.</div>
        ) : (
          tree.entries.map((entry) => {
            if (entry.type === "step") {
              const step = steps[entry.stepIndex];
              if (!step) return null;
              const isActive = entry.stepIndex === currentStepIndex;
              return (
                <StepRow
                  key={`step-${step.contentId}`}
                  step={step}
                  isActive={isActive}
                  onSelect={onSelectStep}
                  rowRef={isActive ? activeRowRef : undefined}
                />
              );
            }
            childNumber += 1;
            return (
              <ContainerNode
                key={`${entry.node.kind}-${entry.node.id}`}
                node={entry.node}
                numbering={childNumber}
                steps={steps}
                currentStepIndex={currentStepIndex}
                openIds={openIds}
                onToggle={toggle}
                onSelectStep={onSelectStep}
                activeRowRef={activeRowRef}
              />
            );
          })
        )}
      </div>
    </aside>
  );
}

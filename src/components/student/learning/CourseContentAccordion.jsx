"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  ClipboardList,
  FileText,
  HelpCircle,
  Minus,
  PlayCircle,
  Plus,
} from "lucide-react";

const VISIBLE_MODULE_LIMIT = 4;

/**
 * Percentage pill for a Module / Lesson / Topic row.
 *
 * Reads the backend roll-up only. A node with no tracked items renders
 * nothing at all rather than "0%", which would read as the student having
 * failed to start something that does not exist yet.
 */
export function NodeBadge({ progress, nodeId, node: nodeProp }) {
  const indexNode = nodeId && progress?.nodes?.get ? progress.nodes.get(nodeId) : (progress?.nodes && nodeId ? progress.nodes[nodeId] : null);
  const node = indexNode || nodeProp;

  const percent = typeof indexNode?.progressPercent === 'number'
    ? indexNode.progressPercent
    : (typeof nodeProp?.progressPercent === 'number' ? nodeProp.progressPercent : (typeof node?.progressPercent === 'number' ? node.progressPercent : null));

  if (percent === null || percent === undefined) return null;

  const totalItems = indexNode?.totalItems ?? nodeProp?.totalItems ?? node?.totalItems ?? 0;
  const completedItems = indexNode?.completedItems ?? nodeProp?.completedItems ?? node?.completedItems ?? 0;
  const applicable = indexNode?.applicable ?? nodeProp?.applicable ?? node?.applicable;

  if (applicable === false && totalItems === 0) return null;

  const completed = indexNode?.completed ?? nodeProp?.completed ?? node?.completed ?? (percent === 100);

  return (
    <span
      className={`shrink-0 text-[11px] font-black tabular-nums px-1.5 py-0.5 rounded border ${
        completed
          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-500"
          : "bg-background border-border text-muted-foreground"
      }`}
      title={`${completedItems} of ${totalItems} items complete`}
    >
      {percent}%
    </span>
  );
}

const ITEM_META = {
  QUIZ: { icon: HelpCircle, className: "text-emerald-600 dark:text-emerald-400" },
  ASSIGNMENT: { icon: ClipboardList, className: "text-amber-600 dark:text-amber-400" },
  CONTENT: { icon: FileText, className: "text-muted-foreground" },
};

/**
 * One learning item — a Content cell, a Quiz or an Assignment — at whatever
 * level it hangs off. Completion is the backend's `completed` flag; this row
 * never infers it from a submission of its own.
 */
function ItemRow({ item, kind, onSelect, scope }) {
  const meta = ITEM_META[kind] || ITEM_META.CONTENT;
  const Icon = meta.icon;
  const isComplete = item.completed === true;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(item, kind, scope)}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition border-0 bg-transparent outline-none min-h-[40px] cursor-pointer hover:bg-muted/40"
    >
      {isComplete ? (
        <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
      ) : (
        <Circle size={13} className="text-muted-foreground/50 shrink-0" />
      )}
      <Icon size={12} className={`${meta.className} shrink-0`} />
      <span className="truncate text-[13px] font-medium text-foreground flex-1">
        {item.title || "Untitled"}
      </span>
    </button>
  );
}

/**
 * Every direct (non-inherited) item owned by one node, in one block.
 *
 * Rendered at Course, Module, Lesson and Topic level — an item attached
 * directly to a Module or a Lesson counts toward that node's progress, so
 * hiding it would leave the student unable to reach something the percentage
 * is already holding against them.
 */
/**
 * `scope` names the Lesson/Topic an item hangs off, and is forwarded with every
 * selection. The player's block sequence is Topic- or Lesson-scoped, so the
 * handler cannot tell where an item belongs from its id alone — passing only
 * the id is what made these rows do nothing when tapped.
 */
function DirectItems({ node, onSelectItem, scope }) {
  const contents = node?.contents || [];
  const quizzes = node?.quizzes || [];
  const assignments = node?.assignments || [];
  if (contents.length + quizzes.length + assignments.length === 0) return null;

  return (
    <div className="space-y-0.5">
      {contents.map((c) => (
        <ItemRow key={`c-${c.id}`} item={c} kind="CONTENT" onSelect={onSelectItem} scope={scope} />
      ))}
      {quizzes.map((q) => (
        <ItemRow key={`q-${q.id}`} item={q} kind="QUIZ" onSelect={onSelectItem} scope={scope} />
      ))}
      {assignments.map((a) => (
        <ItemRow key={`a-${a.id}`} item={a} kind="ASSIGNMENT" onSelect={onSelectItem} scope={scope} />
      ))}
    </div>
  );
}

export default function CourseContentAccordion({
  modules = [],
  course = null,
  progress = null,
  activeModuleId,
  onToggleModule,
  selectedLessonId,
  onSelectLesson,
  onSelectItem,
  collapsed = false,
  onToggleCollapsed,
}) {
  const [modulesExpanded, setModulesExpanded] = useState(false);

  const activeModuleIndex = modules.findIndex((m) => m.id === activeModuleId);
  const forceShowAll = activeModuleIndex >= VISIBLE_MODULE_LIMIT;
  const showAllModules = modulesExpanded || forceShowAll || modules.length <= VISIBLE_MODULE_LIMIT;
  const visibleModules = showAllModules ? modules : modules.slice(0, VISIBLE_MODULE_LIMIT);
  const hiddenModuleCount = modules.length - visibleModules.length;

  const hasCourseDirectItems =
    (course?.contents?.length || 0) +
      (course?.quizzes?.length || 0) +
      (course?.assignments?.length || 0) >
    0;

  return (
    <div className="rounded-3xl border border-border/80 bg-[#0d0e16]/60 backdrop-blur-md shadow-xl overflow-hidden">
      <div className={`p-4 sm:p-5 ${collapsed ? "" : "border-b border-border/60"}`}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-black uppercase tracking-widest text-foreground">
            Course Content
          </h3>
          <div className="flex items-center gap-2">
            <NodeBadge progress={progress} nodeId={course?.id} node={course} />
            {onToggleCollapsed && (
              <button
                type="button"
                onClick={onToggleCollapsed}
                title={collapsed ? "Show Course Content" : "Hide Course Content"}
                className="relative h-7 w-7 flex items-center justify-center rounded-full text-primary hover:text-orange-300 hover:bg-primary/10 transition cursor-pointer bg-transparent outline-none before:content-[''] before:absolute before:-inset-[9px]"
              >
                {collapsed ? <Plus size={14} /> : <Minus size={14} />}
              </button>
            )}
          </div>
        </div>
      </div>

      {!collapsed && (
        <div className="divide-y divide-slate-800/60">
          {/* Course-level direct items — these belong to no Module, so without
              their own block at the root they would be unreachable here. */}
          {hasCourseDirectItems && (
            <div className="px-2 sm:px-3 py-2">
              <p className="px-3 pb-1 text-[12px] font-black uppercase tracking-wider text-muted-foreground">
                Course Materials
              </p>
              <DirectItems node={course} onSelectItem={onSelectItem} scope={{}} />
            </div>
          )}

          {visibleModules.map((module, moduleIndex) => {
            const expanded = module.id === activeModuleId;
            const lessonCount = module.lessons?.length || 0;
            const hasModuleDirectItems =
              (module.contents?.length || 0) +
                (module.quizzes?.length || 0) +
                (module.assignments?.length || 0) >
              0;

            return (
              <div key={module.id}>
                <button
                  type="button"
                  onClick={() => onToggleModule(module.id)}
                  className="flex w-full items-center justify-between gap-3 px-4 sm:px-5 py-3.5 text-left transition min-h-[44px] cursor-pointer border-0 bg-transparent outline-none hover:bg-background/40"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-foreground truncate">
                      Module {moduleIndex + 1}: {module.title}
                    </h4>
                    <p className="text-[12px] text-muted-foreground font-semibold mt-0.5">
                      {lessonCount} {lessonCount === 1 ? "lesson" : "lessons"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <NodeBadge progress={progress} nodeId={module.id} node={module} />
                    {expanded ? (
                      <ChevronDown size={16} className="text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight size={16} className="text-muted-foreground shrink-0" />
                    )}
                  </div>
                </button>

                {expanded && (
                  <div className="space-y-1 pb-3 px-2 sm:px-3">
                    {/* Module-level direct items, above the lessons they sit beside. */}
                    {hasModuleDirectItems && (
                      <DirectItems node={module} onSelectItem={onSelectItem} scope={{}} />
                    )}

                    {(module.lessons || []).map((lesson, lessonIndex) => {
                      const isActive = lesson.id === selectedLessonId;
                      const topics = lesson.topics || [];

                      return (
                        <div key={lesson.id}>
                          <button
                            type="button"
                            onClick={() => onSelectLesson(lesson, module)}
                            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all border-0 outline-none min-h-[44px] cursor-pointer ${
                              isActive
                                ? "bg-primary text-foreground font-medium shadow-lg shadow-orange-600/10"
                                : "hover:bg-muted/40 text-foreground bg-transparent"
                            }`}
                          >
                            {isActive ? (
                              <PlayCircle size={15} className="text-foreground shrink-0" />
                            ) : (
                              <span className="h-2 w-2 rounded-full bg-slate-700 shrink-0 ml-[3px] mr-[3px]" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">
                                {lessonIndex + 1}. {lesson.title}
                              </p>
                              <p
                                className={`truncate text-[12px] ${
                                  isActive ? "text-orange-400" : "text-muted-foreground"
                                }`}
                              >
                                {topics.length ? `${topics.length} Topics` : lesson.duration || ""}
                              </p>
                            </div>
                            <NodeBadge progress={progress} nodeId={lesson.id} node={lesson} />
                          </button>

                          {/* The active lesson opens to reveal its own direct
                              items and its Topics, so every level of the
                              hierarchy is reachable on mobile too. */}
                          {isActive && (
                            <div className="ml-4 pl-2 border-l border-border/60 space-y-0.5 mt-0.5">
                              <DirectItems node={lesson} onSelectItem={onSelectItem} scope={{ lesson }} />

                              {topics.map((topic) => (
                                <div key={topic.id}>
                                  <div className="flex items-center justify-between gap-2 px-3 pt-1.5 pb-0.5">
                                    <span className="truncate text-[12px] font-black uppercase tracking-wider text-muted-foreground flex-1">
                                      {topic.title}
                                    </span>
                                    <NodeBadge progress={progress} nodeId={topic.id} node={topic} />
                                  </div>
                                  <DirectItems node={topic} onSelectItem={onSelectItem} scope={{ lesson, topic }} />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {lessonCount === 0 && !hasModuleDirectItems && (
                      <div className="px-3 py-2 text-sm text-muted-foreground italic">
                        No lessons available
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {modules.length > VISIBLE_MODULE_LIMIT && !forceShowAll && (
            <button
              type="button"
              onClick={() => setModulesExpanded((prev) => !prev)}
              className="w-full px-4 sm:px-5 py-3 min-h-[44px] text-[12px] font-black uppercase tracking-wider text-primary hover:text-orange-300 transition cursor-pointer border-0 bg-transparent outline-none"
            >
              {modulesExpanded
                ? "Show Less"
                : `Show ${hiddenModuleCount} More ${hiddenModuleCount === 1 ? "Module" : "Modules"}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

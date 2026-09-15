"use client";

import { useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  MoreVertical,
  Plus,
  Pencil,
  Trash2,
  Search,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/shadcn/dropdown-menu";

export function CourseStructureSidebar({
  modules = [],
  composerMode,
  composeModuleId,
  composeLessonId,
  expandedModules,
  onToggleModuleExpand,
  onSelectCourseOverview,
  onSelectModule,
  onSelectLesson,
  onAddModule,
  onAddLesson,
  onDeleteModule,
  onDeleteLesson,
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredModules = modules.filter((mod) => {
    if (!searchQuery.trim()) return true;
    const term = searchQuery.toLowerCase();
    const modMatches = mod.title?.toLowerCase().includes(term);
    const lessonMatches = (mod.lessons || []).some((l) =>
      l.title?.toLowerCase().includes(term)
    );
    return modMatches || lessonMatches;
  });

  return (
    <aside className="rounded-2xl border border-border bg-background/80 p-3.5 shadow-xl flex flex-col h-full max-h-[calc(100vh-6rem)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-1 pb-3 mb-2 border-b border-border/80 shrink-0">
        <h2 className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2">
          <Folder size={14} className="text-primary" />
          <span>Course Structure</span>
        </h2>
        <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">
          {modules.length} Modules
        </span>
      </div>

      {/* Search Input */}
      <div className="relative mb-3 shrink-0">
        <Search size={13} className="absolute left-3 top-2.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Filter structure..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-background border border-border rounded-xl !pl-8 !pr-3 py-1.5 text-sm text-foreground placeholder-slate-500 outline-none focus:border-primary transition"
        />
      </div>

      {/* Navigation Tree */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-sm">
        {/* Course Overview Root Item */}
        <div
          onClick={onSelectCourseOverview}
          className={`group flex items-center justify-between px-3 py-2 rounded-xl transition cursor-pointer ${
            composerMode === "course"
              ? "bg-primary/10 border-l-3 border-primary text-primary font-bold"
              : "text-foreground hover:bg-background/70 hover:text-slate-50"
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen
              size={14}
              className={composerMode === "course" ? "text-primary" : "text-muted-foreground"}
            />
            <span className="truncate font-semibold text-sm">Course Overview</span>
          </div>
          <span className="text-[11px] font-black uppercase text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border">
            Root
          </span>
        </div>

        <div className="h-px bg-muted/60 my-2" />

        {/* Modules List */}
        {filteredModules.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm italic">
            No modules found.
          </div>
        ) : (
          filteredModules.map((mod, idx) => {
            const isModuleExpanded = expandedModules[mod.id] !== false;
            const isModuleSelected = composerMode === "module" && composeModuleId === mod.id;
            const modLessons = mod.lessons || [];

            return (
              <div key={mod.id} className="space-y-0.5">
                {/* Module Structural Header Row */}
                <div
                  onClick={() => onSelectModule(mod)}
                  className={`group flex items-center justify-between px-2.5 py-2 rounded-xl transition cursor-pointer ${
                    isModuleSelected
                      ? "bg-primary/10 border-l-3 border-primary text-primary font-bold"
                      : "text-foreground hover:bg-background/60"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleModuleExpand(mod.id);
                      }}
                      className="p-0.5 text-muted-foreground hover:text-slate-50 transition cursor-pointer"
                    >
                      {isModuleExpanded ? (
                        <ChevronDown size={13} className="text-primary" />
                      ) : (
                        <ChevronRight size={13} />
                      )}
                    </button>

                    <span className="truncate text-sm font-bold leading-snug">
                      M{idx + 1}: {mod.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11.5px] font-bold text-muted-foreground bg-background border border-border px-1.5 py-0.5 rounded-md">
                      {modLessons.length}
                    </span>

                    {/* Contextual Module Action Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          className="[@media(hover:hover)]:opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-slate-50 rounded transition cursor-pointer"
                        >
                          <MoreVertical size={13} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-background border-border text-foreground text-sm">
                        <DropdownMenuItem
                          onSelect={() => onSelectModule(mod)}
                          className="cursor-pointer hover:bg-background"
                        >
                          <Pencil className="mr-2 size-3 text-muted-foreground" />
                          Edit Module Details
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onSelect={() => onAddLesson(mod.id)}
                          className="cursor-pointer hover:bg-background"
                        >
                          <Plus className="mr-2 size-3 text-primary" />
                          Add Lesson
                        </DropdownMenuItem>

                        <DropdownMenuSeparator className="bg-muted" />

                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={(e) => onDeleteModule(e, mod)}
                          className="cursor-pointer text-red-400 hover:bg-red-950/40"
                        >
                          <Trash2 className="mr-2 size-3" />
                          Delete Module
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Indented Lessons Sub-rows */}
                {isModuleExpanded && (
                  <div className="pl-5 space-y-0.5 border-l border-border/80 ml-3.5 py-0.5">
                    {modLessons.length === 0 ? (
                      <p className="text-[12px] text-muted-foreground py-1 pl-2 italic">
                        No lessons yet
                      </p>
                    ) : (
                      modLessons.map((lesson, lIdx) => {
                        const isLessonSelected =
                          composerMode === "lesson" && composeLessonId === lesson.id;
                        const blockCount = (lesson.topics || []).reduce(
                          (sum, topic) => sum + (topic._count?.contents ?? topic.contents?.length ?? 0),
                          0
                        );

                        return (
                          <div
                            key={lesson.id}
                            onClick={() => onSelectLesson(lesson.id, mod.id)}
                            className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg transition cursor-pointer text-sm ${
                              isLessonSelected
                                ? "bg-primary/15 text-primary font-bold border-l-2 border-primary"
                                : "text-muted-foreground hover:text-slate-50 hover:bg-background/40"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText
                                size={12}
                                className={
                                  isLessonSelected ? "text-primary shrink-0" : "text-muted-foreground shrink-0"
                                }
                              />
                              <span className="truncate text-[13px] leading-snug">
                                {lIdx + 1}. {lesson.title}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-[11px] font-semibold text-muted-foreground">
                                {blockCount} blks
                              </span>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={(e) => e.stopPropagation()}
                                    className="[@media(hover:hover)]:opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-slate-50 rounded transition cursor-pointer"
                                  >
                                    <MoreVertical size={12} />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-background border-border text-foreground text-sm">
                                  <DropdownMenuItem
                                    onSelect={() => onSelectLesson(lesson.id, mod.id)}
                                    className="cursor-pointer hover:bg-background"
                                  >
                                    <Pencil className="mr-2 size-3 text-muted-foreground" />
                                    Edit Blocks
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    variant="destructive"
                                    onSelect={(e) => onDeleteLesson(e, lesson, mod.id)}
                                    className="cursor-pointer text-red-400 hover:bg-red-950/40"
                                  >
                                    <Trash2 className="mr-2 size-3" />
                                    Delete Lesson
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        );
                      })
                    )}

                    {/* Inline Compact + Add Lesson Action */}
                    <button
                      type="button"
                      onClick={() => onAddLesson(mod.id)}
                      className="w-full text-left py-1 px-2.5 mt-0.5 flex items-center gap-1.5 text-[12px] font-bold text-muted-foreground hover:text-primary transition cursor-pointer"
                    >
                      <Plus size={11} className="text-primary" />
                      <span>Add Lesson</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Action: + Add Module */}
      <div className="pt-3 border-t border-border/80 shrink-0">
        <button
          type="button"
          onClick={onAddModule}
          className="w-full py-2 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border hover:border-primary/70 bg-background hover:bg-background text-foreground hover:text-slate-50 text-sm font-bold transition cursor-pointer"
        >
          <Plus size={13} className="text-primary" />
          <span>Add Module</span>
        </button>
      </div>
    </aside>
  );
}

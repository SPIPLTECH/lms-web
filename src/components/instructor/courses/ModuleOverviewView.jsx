"use client";

import React from "react";
import { useState } from "react";
import {
  Folder,
  Plus,
  Pencil,
  Copy,
  Trash2,
  BookOpen,
  ChevronRight,
} from "lucide-react";
import { CourseComposerItemCard } from "./CourseComposerItemCard";
import { LessonComposerPanel } from "@/components/instructor/LessonComposer/LessonComposerPanel";

export function ModuleOverviewView({
  module,
  onSelectLesson,
  onAddLesson,
  onEditModule,
  onEditLesson,
  onAddTopic,
  onDuplicateLesson,
  onDeleteLesson,
  allModules = [],
  onSelectModule,
  isDraftMode = false,
  role = "INSTRUCTOR",
  contentAutoOpenSignal: externalContentAutoOpenSignal = 0,
  onContentAutoOpenConsumed,
  onAddQuiz,
}) {
  const [localContentAutoOpenSignal, setContentAutoOpenSignal] = useState(0);
  const contentAutoOpenSignal = externalContentAutoOpenSignal + localContentAutoOpenSignal;
  const handleContentAutoOpenConsumed = () => {
    setContentAutoOpenSignal(0);
    onContentAutoOpenConsumed?.();
  };

  if (!module) return null;

  const lessons = module.lessons || [];

  // Compute Next Module in course sequence
  const currentModIdx = allModules.findIndex((m) => m.id === module.id);
  const nextModule = currentModIdx >= 0 && currentModIdx < allModules.length - 1 ? allModules[currentModIdx + 1] : null;

  return (
    <div className="notebook-cell rounded-2xl border border-border bg-background p-3 sm:p-6 shadow-md space-y-6">
      {/* Module Header Toolbar */}
      <div className="cell-header flex items-center justify-between border-b border-border/80 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="cell-badge rounded bg-primary/15 border border-primary/30 px-2.5 py-1 text-[12px] font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
            <Folder size={12} />
            Module Header
          </span>
        </div>
        <div className="cell-controls">
          <button
            type="button"
            className="border border-border text-foreground hover:text-foreground bg-background hover:bg-muted rounded-xl px-3 py-1.5 text-sm font-bold transition cursor-pointer flex items-center gap-1.5"
            onClick={() => onEditModule?.(module)}
          >
            <Pencil size={13} />
            Edit Module Details
          </button>
        </div>
      </div>

      {/* Module Title & Description */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">{module.title || "Untitled Module"}</h2>
        {module.subtitle && (
          <p className="text-sm font-semibold text-primary italic">{module.subtitle}</p>
        )}
        {(module.summary || module.description) && (
          <p className="text-sm text-foreground leading-relaxed bg-background/60 p-3 rounded-xl border border-border/80">
            {module.summary || module.description}
          </p>
        )}
      </div>

      {/* Module-Level Content Cells */}
      {role === "INSTRUCTOR" && !isDraftMode && (
        <div className="pt-4 border-t border-border space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-foreground">Module Content</h3>
            <button
              type="button"
              onClick={() => setContentAutoOpenSignal((n) => n + 1)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary text-sm font-bold transition cursor-pointer"
            >
              <Plus size={14} />
              Add Content
            </button>
          </div>
          <LessonComposerPanel
            parent={{ parentType: "module", parentId: module.id }}
            autoOpenAddSignal={contentAutoOpenSignal}
            onAutoOpenConsumed={handleContentAutoOpenConsumed}
            onAddQuiz={onAddQuiz}
          />
        </div>
      )}

      {/* LESSONS SECTION */}
      <div className="pt-4 border-t border-border space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-primary" />
            <h3 className="text-base font-bold text-foreground">Lessons</h3>
            <span className="text-sm font-mono font-bold text-muted-foreground bg-background px-2 py-0.5 rounded border border-border">
              {lessons.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onAddLesson?.(module.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary text-sm font-bold transition cursor-pointer"
            >
              <Plus size={14} />
              Add Lesson
            </button>
          </div>
        </div>

        {/* LESSONS GRID OR EMPTY STATE */}
        {lessons.length === 0 ? (
          <div className="p-8 text-center bg-background/40 rounded-2xl border border-border/80 space-y-3">
            <div className="p-3 rounded-xl bg-primary/10 text-primary inline-block">
              <BookOpen size={24} />
            </div>
            <div>
              <h4 className="text-base font-bold text-foreground">No lessons yet</h4>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
                Add your first lesson to start organizing topics and learning materials.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onAddLesson?.(module.id)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-primary text-foreground text-sm font-bold transition shadow-lg shadow-orange-600/20 cursor-pointer"
            >
              <Plus size={14} />
              Add Lesson
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {lessons.map((lesson, idx) => {
              const topics = lesson.topics || [];
              const topicsCount = topics.length;
              // See LessonOverviewView: useModules supplies each topic's content
              // count via Prisma's `_count.contents`, not a full `contents` array
              // (draft-mode topics are the exception, hence the fallback).
              const contentsCount = topics.reduce(
                (acc, t) => acc + (t._count?.contents ?? (Array.isArray(t.contents) ? t.contents.length : 0)),
                0
              );

              const menuItems = [
                {
                  label: "Edit Lesson Details",
                  icon: Pencil,
                  onSelect: () => onEditLesson?.(lesson),
                },
                {
                  label: "Add Topic",
                  icon: Plus,
                  highlight: true,
                  onSelect: () => onAddTopic?.(lesson.id),
                },
                onDuplicateLesson && {
                  label: "Duplicate Lesson",
                  icon: Copy,
                  onSelect: () => onDuplicateLesson?.(lesson),
                },
                { separator: true },
                {
                  label: "Delete Lesson",
                  icon: Trash2,
                  destructive: true,
                  onSelect: (e) => onDeleteLesson?.(e, lesson, module.id),
                },
              ].filter(Boolean);

              return (
                <CourseComposerItemCard
                  key={lesson.id || `lesson-${idx}`}
                  orderNumber={idx + 1}
                  title={lesson.title || `Lesson ${idx + 1}`}
                  subtitle={lesson.subtitle || lesson.summary || lesson.description}
                  metadataText={`${topicsCount} ${topicsCount === 1 ? "Topic" : "Topics"} · ${contentsCount} ${contentsCount === 1 ? "Content" : "Contents"}`}
                  onClick={() => onSelectLesson?.(lesson.id)}
                  menuItems={menuItems}
                  badgeColorClass="bg-primary/15 text-primary border-primary/30"
                  hoverTextClass="group-hover:text-primary"
                  hoverBorderClass="hover:border-primary/40"
                  arrowColorClass="group-hover:text-primary"
                />
              );
            })}
          </div>
        )}
      </div>

      {/* NEXT MODULE NAVIGATION FOOTER */}
      {nextModule && (
        <div className="pt-6 border-t border-border flex items-center justify-end">
          <button
            type="button"
            onClick={() => onSelectModule?.(nextModule)}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-primary/40 bg-primary/10 hover:bg-primary/20 text-right transition group cursor-pointer max-w-[280px]"
          >
            <div className="overflow-hidden">
              <span className="text-[12px] font-mono font-bold uppercase tracking-wider text-primary block">Next Module</span>
              <span className="text-sm font-bold text-foreground truncate block">{nextModule.title}</span>
            </div>
            <ChevronRight size={16} className="text-primary group-hover:translate-x-0.5 transition shrink-0" />
          </button>
        </div>
      )}
    </div>
  );
}

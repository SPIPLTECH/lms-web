"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  Plus,
  Check,
  X,
  Sparkles,
} from "lucide-react";

import LessonNavItem from "@/components/instructor/composer/LessonNavItem";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";

import { useUpdateModule } from "@/hooks/queries/instructor/useUpdateModule";
import { useDeleteModule } from "@/hooks/queries/instructor/useDeleteModule";
import { useCreateLesson } from "@/hooks/queries/instructor/useCreateLesson";
import { useReorderLessons } from "@/hooks/queries/instructor/useReorderLessons";
import { useConfirm } from "@/context/ConfirmContext";

export default function ModuleAccordionItem({
  module: mod,
  courseId,
  isFirst,
  isLast,
  selectedLessonId,
  onSelectLesson,
  onMoveModuleUp,
  onMoveModuleDown,
  onOpenAiAssistant,
  defaultOpen,
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  const [editOpen, setEditOpen] = useState(false);
  const [title, setTitle] = useState(mod.title);
  const [description, setDescription] = useState(mod.description || "");
  const [addingLesson, setAddingLesson] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState("");

  const updateModule = useUpdateModule();
  const deleteModule = useDeleteModule();
  const createLesson = useCreateLesson();
  const reorderLessons = useReorderLessons();
  const confirm = useConfirm();

  const lessons = [...(mod.lessons || [])].sort((a, b) => a.order - b.order);

  const openEditModal = () => {
    setTitle(mod.title);
    setDescription(mod.description || "");
    setEditOpen(true);
  };

  const saveEdit = () => {
    if (!title.trim()) {
      setTitle(mod.title);
      return;
    }
    if (title !== mod.title || description !== (mod.description || "")) {
      updateModule.mutate({ moduleId: mod.id, moduleData: { courseId, title, description } });
    }
    setEditOpen(false);
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    const ok = await confirm({
      title: "Delete module",
      message: `Delete "${mod.title}" and everything inside it?`,
      confirmText: "Delete",
    });
    if (!ok) return;
    deleteModule.mutate(mod.id);
  };

  const handleAddLesson = () => {
    if (!newLessonTitle.trim()) return;
    createLesson.mutate(
      { moduleId: mod.id, title: newLessonTitle },
      { onSuccess: () => setOpen(true) },
    );
    setNewLessonTitle("");
    setAddingLesson(false);
  };

  const moveLesson = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= lessons.length) return;

    // Swap the two lessons' positions only: the module's own content shares
    // the sequence, and renumbering lessons 1..n would jump them over it.
    const moved = lessons[index];
    const neighbour = lessons[targetIndex];
    reorderLessons.mutate({
      moduleId: mod.id,
      lessons: [
        { id: moved.id, order: neighbour.order },
        { id: neighbour.id, order: moved.order },
      ],
    });
  };

  return (
    <div className="rounded-lg border border-border bg-background/30 overflow-hidden">
      <div
        onClick={() => setOpen((v) => !v)}
        className="group flex items-center gap-1.5 px-2.5 py-2 cursor-pointer hover:bg-muted/40"
      >
        {open ? (
          <ChevronDown size={14} className="text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-muted-foreground shrink-0" />
        )}

        <span className="flex-1 min-w-0 truncate text-sm font-bold text-foreground">{mod.title}</span>

        <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            disabled={isFirst}
            onClick={(e) => {
              e.stopPropagation();
              onMoveModuleUp();
            }}
            className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-20"
          >
            <ArrowUp size={12} />
          </button>
          <button
            type="button"
            disabled={isLast}
            onClick={(e) => {
              e.stopPropagation();
              onMoveModuleDown();
            }}
            className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-20"
          >
            <ArrowDown size={12} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openEditModal();
            }}
            className="p-1 rounded text-muted-foreground hover:text-foreground"
          >
            <Pencil size={12} />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="p-1 rounded text-muted-foreground hover:text-red-400"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {open && (
        <div className="px-2 pb-2 space-y-0.5 border-t border-border/60 pt-1.5">
          {lessons.map((lesson, i) => (
            <LessonNavItem
              key={lesson.id}
              lesson={lesson}
              moduleId={mod.id}
              isActive={lesson.id === selectedLessonId}
              isFirst={i === 0}
              isLast={i === lessons.length - 1}
              onSelect={() => onSelectLesson(lesson.id)}
              onMoveUp={() => moveLesson(i, -1)}
              onMoveDown={() => moveLesson(i, 1)}
            />
          ))}

          {addingLesson ? (
            <div className="flex items-center gap-1.5 px-2 py-1">
              <input
                autoFocus
                value={newLessonTitle}
                onChange={(e) => setNewLessonTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddLesson()}
                onBlur={() => !newLessonTitle.trim() && setAddingLesson(false)}
                placeholder="Lesson title…"
                className="flex-1 min-w-0 bg-muted rounded px-1.5 py-1 text-xs outline-none border border-primary"
              />
            </div>
          ) : (
            // Both of these perform an action, so they carry a button surface
            // rather than sitting as plain muted text the way the lesson names
            // above them (which navigate) do.
            <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-border/40">
              <button
                type="button"
                onClick={() => setAddingLesson(true)}
                className="flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs font-semibold text-foreground hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
              >
                <Plus size={12} /> Add Lesson
              </button>
              <button
                type="button"
                onClick={() => onOpenAiAssistant && onOpenAiAssistant("LESSON", { moduleId: mod.id, moduleTitle: mod.title })}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors cursor-pointer"
              >
                <Sparkles size={11} /> AI Lesson
              </button>
            </div>
          )}
        </div>
      )}

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Module" size="sm">
        <div className="space-y-4">
          <Input label="Module Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="space-y-2">
            <label className="text-sm text-foreground">Subtitle / Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What does this module cover?"
              className="w-full rounded-lg border border-transparent bg-muted px-3 py-2 text-sm outline-none focus:border-primary resize-y"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-foreground bg-muted hover:bg-border border border-border rounded-lg transition cursor-pointer"
            >
              <X size={12} /> Cancel
            </button>
            <button
              type="button"
              onClick={saveEdit}
              disabled={updateModule.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 rounded-lg transition disabled:opacity-50 cursor-pointer"
            >
              <Check size={12} /> {updateModule.isPending ? "Saving…" : "Done"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Settings, Plus, BookOpen, Sparkles } from "lucide-react";

import ModuleAccordionItem from "@/components/instructor/composer/ModuleAccordionItem";
import { useCreateModule } from "@/hooks/queries/instructor/useCreateModule";
import { useReorderModules } from "@/hooks/queries/instructor/useReorderModules";

export default function ComposerSidebar({
  course,
  courseId,
  selectedLessonId,
  view,
  onSelectLesson,
  onSelectSettings,
  onOpenAiAssistant,
}) {
  const [addingModule, setAddingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");

  const createModule = useCreateModule();
  const reorderModules = useReorderModules();

  const modules = [...(course.modules || [])].sort((a, b) => a.order - b.order);

  const handleAddModule = () => {
    if (!newModuleTitle.trim()) return;
    createModule.mutate({ courseId, title: newModuleTitle });
    setNewModuleTitle("");
    setAddingModule(false);
  };

  const moveModule = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= modules.length) return;

    // Swap the two modules' positions only: the course's own content shares
    // the sequence, and renumbering modules 1..n would jump them over it.
    const moved = modules[index];
    const neighbour = modules[targetIndex];
    reorderModules.mutate({
      courseId,
      modules: [
        { id: moved.id, order: neighbour.order },
        { id: neighbour.id, order: moved.order },
      ],
    });
  };

  return (
    <aside className="w-full lg:w-80 shrink-0 space-y-3">
      <div className="rounded-2xl border border-border bg-background/50 backdrop-blur-md p-4 space-y-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
          Course Map
        </p>

        <button
          type="button"
          onClick={onSelectSettings}
          className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-bold transition ${
            view === "settings"
              ? "bg-primary/10 text-primary"
              : "text-foreground hover:bg-muted/60"
          }`}
        >
          <Settings size={14} /> Course Settings
        </button>

        <div className="space-y-1.5 max-h-[65vh] overflow-y-auto pr-1">
          {modules.length === 0 && (
            <p className="text-xs text-slate-600 px-2 py-3 flex items-center gap-1.5">
              <BookOpen size={12} /> No modules yet
            </p>
          )}
          {modules.map((mod, i) => (
            <ModuleAccordionItem
              key={mod.id}
              module={mod}
              courseId={courseId}
              isFirst={i === 0}
              isLast={i === modules.length - 1}
              selectedLessonId={view === "lesson" ? selectedLessonId : null}
              onSelectLesson={onSelectLesson}
              onMoveModuleUp={() => moveModule(i, -1)}
              onMoveModuleDown={() => moveModule(i, 1)}
              onOpenAiAssistant={onOpenAiAssistant}
              defaultOpen={(mod.lessons || []).some((l) => l.id === selectedLessonId)}
            />
          ))}
        </div>

        {addingModule ? (
          <input
            autoFocus
            value={newModuleTitle}
            onChange={(e) => setNewModuleTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddModule()}
            onBlur={() => !newModuleTitle.trim() && setAddingModule(false)}
            placeholder="Module title…"
            className="w-full bg-muted rounded-lg px-2.5 py-2 text-sm outline-none border border-primary"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAddingModule(true)}
              className="inline-flex items-center justify-center gap-1 py-2 text-xs font-bold text-foreground hover:text-foreground bg-muted hover:bg-slate-750 border border-transparent/60 rounded-lg transition"
            >
              <Plus size={12} /> Module
            </button>
            <button
              type="button"
              onClick={() => onOpenAiAssistant && onOpenAiAssistant("MODULE")}
              className="inline-flex items-center justify-center gap-1 py-2 text-xs font-bold text-primary hover:text-orange-300 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-lg transition"
            >
              <Sparkles size={12} /> AI Module
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

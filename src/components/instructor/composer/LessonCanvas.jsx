"use client";

import { useMemo, useState } from "react";
import { Plus, Sparkles } from "lucide-react";

import ContentBlockCard from "@/components/instructor/composer/ContentBlockCard";
import AddBlockModal from "@/components/instructor/composer/AddBlockModal";
import { blockRegistry } from "@/components/instructor/composer/blocks/blockRegistry";
import { fromContentRow } from "@/components/instructor/composer/mappers/contentBlockMapper";

import { useUpdateLesson } from "@/hooks/queries/instructor/useUpdateLesson";
import { useReorderContents } from "@/hooks/queries/instructor/useReorderContents";

export default function LessonCanvas({ lesson, moduleId, courseId, onOpenAiAssistant }) {
  const [description, setDescription] = useState(lesson.description || "");
  const [draftBlocks, setDraftBlocks] = useState([]);
  const [addModalAfterId, setAddModalAfterId] = useState(undefined); // undefined = closed, null = append at end

  const updateLesson = useUpdateLesson();
  const reorderContents = useReorderContents();

  // All of the lesson's Content rows, mapped and sorted, both top-level and
  // nested — nested blocks render exclusively through their parent's own
  // flow/positioned nesting UI, never in this top-level list, but the full
  // set is threaded down so containers can find their own children without
  // a separate fetch.
  const allLessonContents = useMemo(
    () =>
      [...(lesson.contents || [])]
        .sort((a, b) => a.order - b.order)
        .map((row) => fromContentRow(row)),
    [lesson.contents],
  );

  const savedBlocks = useMemo(
    () => allLessonContents.filter((b) => !b.parentContentId),
    [allLessonContents],
  );

  const displayList = useMemo(() => {
    const list = [];
    savedBlocks.forEach((block) => {
      list.push({ block, isDraft: false });
      draftBlocks
        .filter((d) => d.afterBlockId === block.id)
        .forEach((d) => list.push({ block: d, isDraft: true }));
    });
    draftBlocks
      .filter((d) => d.afterBlockId === null)
      .forEach((d) => list.push({ block: d, isDraft: true }));
    return list;
  }, [savedBlocks, draftBlocks]);

  const handleDescriptionBlur = () => {
    if (description === (lesson.description || "")) return;
    updateLesson.mutate({
      lessonId: lesson.id,
      lessonData: { moduleId, description },
    });
  };

  const openAddModal = (afterBlockId) => setAddModalAfterId(afterBlockId);

  const handlePickBlockType = (blockType) => {
    // A position in the lesson's sequence, which also holds its topics: right
    // after the block it was added below, or undefined to append after
    // everything in the lesson (the backend picks the slot).
    const afterBlock = savedBlocks.find((b) => b.id === addModalAfterId);
    const order = afterBlock ? afterBlock.order + 1 : undefined;

    setDraftBlocks((prev) => [
      ...prev,
      {
        ...blockRegistry[blockType].defaultData(),
        id: `draft-${crypto.randomUUID()}`,
        order,
        afterBlockId: addModalAfterId ?? null,
      },
    ]);
    setAddModalAfterId(undefined);
  };

  const handleCancelDraft = (tempId) => {
    setDraftBlocks((prev) => prev.filter((d) => d.id !== tempId));
  };

  const handleDraftSaved = (tempId) => {
    setDraftBlocks((prev) => prev.filter((d) => d.id !== tempId));
  };

  const moveBlock = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= savedBlocks.length) return;

    // Swap the two blocks' positions only. Renumbering the blocks 1..n would
    // also move them past the lesson's topics, which share the sequence.
    const moved = savedBlocks[index];
    const neighbour = savedBlocks[targetIndex];
    reorderContents.mutate({
      parent: { parentType: "lesson", parentId: lesson.id },
      contents: [
        { id: moved.id, order: neighbour.order },
        { id: neighbour.id, order: moved.order },
      ],
    });
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h2 className="text-xl font-black text-foreground">{lesson.title}</h2>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={handleDescriptionBlur}
          rows={2}
          placeholder="Lesson description…"
          className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm text-foreground outline-none focus:border-primary resize-y"
        />
      </div>

      {displayList.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No content blocks yet. Add your first one below.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-background/50 divide-y divide-slate-800/60 overflow-hidden">
          {displayList.map(({ block, isDraft }) => {
            const savedIndex = savedBlocks.findIndex((b) => b.id === block.id);
            return (
              <ContentBlockCard
                key={block.id}
                block={block}
                lessonId={lesson.id}
                moduleId={moduleId}
                courseId={courseId}
                lessonTitle={lesson.title}
                allLessonContents={allLessonContents}
                isNew={isDraft}
                isFirst={isDraft ? true : savedIndex === 0}
                isLast={isDraft ? true : savedIndex === savedBlocks.length - 1}
                onSaved={isDraft ? () => handleDraftSaved(block.id) : () => {}}
                onCancelNew={() => handleCancelDraft(block.id)}
                onDeleted={() => {}}
                onMoveUp={() => moveBlock(savedIndex, -1)}
                onMoveDown={() => moveBlock(savedIndex, 1)}
                onAddAbove={() =>
                  openAddModal(savedIndex > 0 ? savedBlocks[savedIndex - 1].id : null)
                }
                onAddBelow={() => openAddModal(block.id)}
              />
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => openAddModal(null)}
          className="w-full inline-flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-foreground hover:text-foreground bg-background/40 hover:bg-muted border border-dashed border-transparent rounded-xl transition cursor-pointer"
        >
          <Plus size={14} /> Add Block
        </button>
        <button
          type="button"
          onClick={() => onOpenAiAssistant && onOpenAiAssistant("CONTENT", { lessonId: lesson.id, lessonTitle: lesson.title })}
          className="w-full inline-flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-primary hover:text-orange-300 bg-primary/10 hover:bg-primary/20 border border-dashed border-primary/30 rounded-xl transition cursor-pointer"
        >
          <Sparkles size={14} /> Generate Content with AI
        </button>
      </div>

      <AddBlockModal
        open={addModalAfterId !== undefined}
        onClose={() => setAddModalAfterId(undefined)}
        onPick={handlePickBlockType}
      />
    </div>
  );
}

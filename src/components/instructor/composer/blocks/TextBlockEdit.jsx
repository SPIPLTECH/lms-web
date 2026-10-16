"use client";

import { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import MarkdownField from "@/components/instructor/composer/MarkdownField";
import AddBlockModal from "@/components/instructor/composer/AddBlockModal";
import ContentBlockCard from "@/components/instructor/composer/ContentBlockCard";
import FlowNestedChildren from "@/components/instructor/composer/blocks/shared/FlowNestedChildren";
import { blockRegistry } from "@/components/instructor/composer/blocks/blockRegistry";
import { tokenizeMarkdown, groupChildrenByAnchor } from "@/components/instructor/composer/blocks/shared/flowNestingUtils";
import { toContentPayload } from "@/components/instructor/composer/mappers/contentBlockMapper";
import { useCreateContent } from "@/hooks/queries/instructor/useCreateContent";
import { useReorderContents } from "@/hooks/queries/instructor/useReorderContents";

/**
 * forwardRef so ContentBlockCard's "Add Block Inside" menu item can open
 * the picker (anchored at the end of the text by default) via the
 * imperative handle, same contract as SlideshowBlockEdit.
 *
 * Unlike Image/Video/Audio's earlier free-drag overlay experiment, nested
 * children here are real Content rows (parentContentId = this block's id)
 * rendered inline in normal reading order via FlowNestedChildren — no x/y
 * positioning. A child is created immediately on pick (not a client-only
 * draft) since it needs a real parent id to attach to.
 */
const TextBlockEdit = forwardRef(function TextBlockEdit(
  { block, onChange, allLessonContents, lessonId, isNew },
  ref,
) {
  const [pickerAnchor, setPickerAnchor] = useState(null); // null = closed
  const createContent = useCreateContent();
  const reorderContents = useReorderContents();

  const children = useMemo(
    () =>
      (allLessonContents || [])
        .filter((c) => c.parentContentId === block.id)
        .sort((a, b) => a.order - b.order),
    [allLessonContents, block.id],
  );

  const tokens = useMemo(() => tokenizeMarkdown(block.markdown), [block.markdown]);
  const childrenByAnchor = useMemo(
    () => groupChildrenByAnchor(children, tokens.length),
    [children, tokens.length],
  );

  useImperativeHandle(ref, () => ({
    openPicker: () => setPickerAnchor(Math.max(tokens.length - 1, 0)),
  }));

  const handlePick = (blockType) => {
    const anchor = pickerAnchor ?? Math.max(tokens.length - 1, 0);
    const data = { ...blockRegistry[blockType].defaultData(), afterAnchor: anchor };
    const payload = toContentPayload(data, { lessonId, order: 0, parentContentId: block.id });
    createContent.mutate(payload, { onSuccess: () => setPickerAnchor(null) });
  };

  const moveChild = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= children.length) return;

    // Swap the two blocks' positions in the lesson's sequence only.
    const moved = children[index];
    const neighbour = children[targetIndex];
    reorderContents.mutate({
      parent: { parentType: "lesson", parentId: lessonId },
      contents: [
        { id: moved.id, order: neighbour.order },
        { id: neighbour.id, order: moved.order },
      ],
    });
  };

  return (
    <div className="space-y-4">
      <MarkdownField
        label="Markdown content"
        value={block.markdown}
        onChange={(markdown) => onChange({ markdown })}
        rows={6}
        placeholder="Write the lesson text in markdown…"
      />

      {isNew ? (
        <p className="text-xs text-muted-foreground">Save this block once before adding nested content.</p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Nested blocks — click + to insert a video/image/etc. at that point in the text
          </p>
          <div className="rounded-lg border border-border bg-background/40 p-3">
            {tokens.length === 0 && children.length === 0 ? (
              <button
                type="button"
                onClick={() => setPickerAnchor(0)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:text-orange-300"
              >
                <Plus size={11} /> Insert block here
              </button>
            ) : (
              <FlowNestedChildren
                tokens={tokens}
                childrenByAnchor={childrenByAnchor}
                renderChild={(child) => {
                  const childIndex = children.findIndex((c) => c.id === child.id);
                  return (
                    <ContentBlockCard
                      block={child}
                      lessonId={lessonId}
                      allLessonContents={allLessonContents}
                      isFirst={childIndex === 0}
                      isLast={childIndex === children.length - 1}
                      onSaved={() => {}}
                      onCancelNew={() => {}}
                      onDeleted={() => {}}
                      onMoveUp={() => moveChild(childIndex, -1)}
                      onMoveDown={() => moveChild(childIndex, 1)}
                      onAddAbove={() => {}}
                      onAddBelow={() => {}}
                    />
                  );
                }}
                renderInsertPoint={(i) => (
                  <button
                    type="button"
                    onClick={() => setPickerAnchor(i)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:text-orange-300"
                  >
                    <Plus size={11} /> Insert block here
                  </button>
                )}
              />
            )}
          </div>
        </div>
      )}

      <AddBlockModal open={pickerAnchor !== null} onClose={() => setPickerAnchor(null)} onPick={handlePick} />
    </div>
  );
});

export default TextBlockEdit;

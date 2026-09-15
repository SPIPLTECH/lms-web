"use client";

import { useState } from "react";

import { Button } from "@/components/ui/shadcn/button";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/context/ConfirmContext";

import { useCreateContent, useUpdateContent, useDeleteContent } from "../contentMutations";
import { CellShell } from "../CellShell";
import { CELL_TYPES } from "../cellTypes";
import { getErrorMessage } from "../getErrorMessage";
import { buildHeadingHtml, parseHeadingDesign } from "../blockStyle";
import { getContentParent, toParentField, type CellActionProps, type ContentRow, type CreateCellFormProps } from "../types";

const CELL_TYPE = CELL_TYPES.find((c) => c.id === "heading")!;

function extractHeadingText(htmlContent: string | null | undefined): string {
  return parseHeadingDesign(htmlContent).text;
}

interface HeadingCellProps extends CellActionProps {
  content: ContentRow;
}

/** Renders/edits a Heading cell — persisted as `type: "HTML"` (see htmlCellVariant.ts). */
export function HeadingCell({
  content,
  onDuplicate,
  isDuplicating,
  badgeText,
  badgeVariant,
  onSettingsSelect,
  onAddAbove,
  onAddBelow,
  isSelected,
}: HeadingCellProps) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [text, setText] = useState(() => extractHeadingText(content.htmlContent));

  const updateContent = useUpdateContent();
  const deleteContent = useDeleteContent();
  const confirm = useConfirm();
  const { showToast } = useToast();

  const handleEdit = () => {
    setText(extractHeadingText(content.htmlContent));
    setMode("edit");
  };

  const handleCancel = () => {
    setText(extractHeadingText(content.htmlContent));
    setMode("view");
  };

  const handleSave = async () => {
    try {
      await updateContent.mutateAsync({
        contentId: content.id,
        contentData: {
          title: text,
          htmlContent: buildHeadingHtml({ ...parseHeadingDesign(content.htmlContent), text }),
        },
        parent: getContentParent(content),
      });
      setMode("view");
    } catch (error) {
      showToast(getErrorMessage(error, "Failed to save this heading."), "error", "Save failed");
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: "Delete heading",
      message: "This will permanently remove this content from the lesson.",
      confirmText: "Delete",
    });
    if (!confirmed) return;

    try {
      await deleteContent.mutateAsync({ contentId: content.id, parent: getContentParent(content) });
    } catch (error) {
      showToast(getErrorMessage(error, "Failed to delete this heading."), "error", "Delete failed");
    }
  };

  const design = parseHeadingDesign(content.htmlContent);
  const displayText = design.text;
  const ViewTag = (design.tag || "h2") as "h1" | "h2" | "h3" | "h4";

  return (
    <CellShell
      icon={CELL_TYPE.icon}
      typeLabel={CELL_TYPE.label}
      title={content.title || ""}
      mode={mode}
      onEdit={handleEdit}
      onDelete={handleDelete}
      isDeleting={deleteContent.isPending}
      onDuplicate={onDuplicate}
      isDuplicating={isDuplicating}
      badgeText={badgeText}
      badgeVariant={badgeVariant}
      onSettingsSelect={onSettingsSelect}
      onAddAbove={onAddAbove}
      onAddBelow={onAddBelow}
      isSelected={isSelected}
    >
      {mode === "edit" ? (
        <div className="space-y-3">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Heading text"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xl font-bold text-foreground outline-none focus:border-primary"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={updateContent.isPending}>
              {updateContent.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      ) : displayText ? (
        <ViewTag
          className="font-bold tracking-tight text-foreground"
          style={{
            textAlign: design.align,
            color: design.color || undefined,
            fontSize: design.fontSize ? `${design.fontSize}px` : ViewTag === "h1" ? "1.5rem" : ViewTag === "h2" ? "1.25rem" : ViewTag === "h3" ? "1.125rem" : "1rem",
            marginTop: ViewTag === "h1" || ViewTag === "h2" ? "1rem" : "0.5rem",
            marginBottom: "0.5rem",
          }}
        >
          {displayText}
        </ViewTag>
      ) : (
        <p className="text-base italic text-muted-foreground">No heading text yet.</p>
      )}
    </CellShell>
  );
}

/** The "Add Cell" creation form for a Heading block — hosted inside AddCellModal. */
export function CreateHeadingForm({ parent, order, onCreated, onCancel }: CreateCellFormProps) {
  const [text, setText] = useState("");

  const createContent = useCreateContent();
  const { showToast } = useToast();

  const handleCreate = async () => {
    try {
      await createContent.mutateAsync({
        ...toParentField(parent),
        type: "HTML",
        order,
        title: text,
        htmlContent: buildHeadingHtml({ tag: "h2", text }),
      });
      onCreated();
    } catch (error) {
      showToast(getErrorMessage(error, "Failed to add this heading."), "error", "Add failed");
    }
  };

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Heading text"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xl font-bold text-foreground outline-none focus:border-primary"
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={handleCreate} disabled={createContent.isPending || !text.trim()}>
          {createContent.isPending ? "Adding…" : "Add Heading"}
        </Button>
      </div>
    </div>
  );
}

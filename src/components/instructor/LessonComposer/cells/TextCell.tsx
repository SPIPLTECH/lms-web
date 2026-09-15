"use client";

import { useState } from "react";

import MarkdownEditor from "@/components/ui/MarkdownEditor/MarkdownEditor";
import MarkdownRenderer from "@/components/ui/MarkdownEditor/MarkdownRenderer";
import { escapeForContentApi, unescapeFromContentApi } from "@/lib/markdown";
import { htmlToMarkdown } from "@/lib/htmlToMarkdown";
import { Button } from "@/components/ui/shadcn/button";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/context/ConfirmContext";
import { useCreateContent, useUpdateContent, useDeleteContent } from "../contentMutations";
import { CellShell } from "../CellShell";
import { CELL_TYPES } from "../cellTypes";
import { getErrorMessage } from "../getErrorMessage";
import { getContentParent, toParentField, type CellActionProps, type ContentRow, type CreateCellFormProps } from "../types";

const CELL_TYPE = CELL_TYPES.find((c) => c.id === "text")!;

interface TextCellProps extends CellActionProps {
  content: ContentRow;
}

/** Renders/edits a `type: "HTML"` Content row — Markdown source, sent through `escapeForContentApi` since the backend runs `htmlContent` through `sanitize-html` on save (see src/lib/markdown.js). */
export function TextCell({
  content,
  onDuplicate,
  isDuplicating,
  badgeText,
  badgeVariant,
  onSettingsSelect,
  onAddAbove,
  onAddBelow,
  isSelected,
}: TextCellProps) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [title, setTitle] = useState(content.title ?? "");
  const [markdownSource, setMarkdownSource] = useState(() =>
    htmlToMarkdown(unescapeFromContentApi(content.htmlContent ?? ""))
  );

  const updateContent = useUpdateContent();
  const deleteContent = useDeleteContent();
  const confirm = useConfirm();
  const { showToast } = useToast();

  const handleEdit = () => {
    setTitle(content.title ?? "");
    setMarkdownSource(htmlToMarkdown(unescapeFromContentApi(content.htmlContent ?? "")));
    setMode("edit");
  };

  const handleCancel = () => {
    setTitle(content.title ?? "");
    setMarkdownSource(htmlToMarkdown(unescapeFromContentApi(content.htmlContent ?? "")));
    setMode("view");
  };

  const handleSave = async () => {
    try {
      await updateContent.mutateAsync({
        contentId: content.id,
        contentData: { title, htmlContent: escapeForContentApi(markdownSource) },
        parent: getContentParent(content),
      });
      setMode("view");
    } catch (error) {
      showToast(getErrorMessage(error, "Failed to save this text block."), "error", "Save failed");
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: "Delete text block",
      message: "This will permanently remove this content from the lesson.",
      confirmText: "Delete",
    });
    if (!confirmed) return;

    try {
      await deleteContent.mutateAsync({ contentId: content.id, parent: getContentParent(content) });
    } catch (error) {
      showToast(getErrorMessage(error, "Failed to delete this block."), "error", "Delete failed");
    }
  };

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
        <div className="flex-1 min-h-0 flex flex-col space-y-3 overflow-hidden">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Block title (optional)"
            className="shrink-0 w-full rounded-lg border border-border bg-background px-3 py-2 text-base text-foreground outline-none focus:border-primary"
          />
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <MarkdownEditor
              value={markdownSource}
              onChange={setMarkdownSource}
              placeholder="Write the lesson text in Markdown…"
            />
          </div>
          <div className="shrink-0 pt-3 border-t border-border flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={updateContent.isPending}>
              {updateContent.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      ) : (
        <MarkdownRenderer
          source={unescapeFromContentApi(content.htmlContent ?? "")}
          emptyText="No text content yet."
        />
      )}
    </CellShell>
  );
}

/** The "Add Cell" creation form for a Text block — hosted inside AddCellModal. */
export function CreateTextForm({ parent, order, onCreated, onCancel }: CreateCellFormProps) {
  const [title, setTitle] = useState("");
  const [markdownSource, setMarkdownSource] = useState("");

  const createContent = useCreateContent();
  const { showToast } = useToast();

  const handleCreate = async () => {
    try {
      await createContent.mutateAsync({
        ...toParentField(parent),
        type: "HTML",
        order,
        title,
        htmlContent: escapeForContentApi(markdownSource),
      });
      onCreated();
    } catch (error) {
      showToast(getErrorMessage(error, "Failed to add this text block."), "error", "Add failed");
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-3 overflow-hidden">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Block title (optional)"
        className="shrink-0 w-full rounded-lg border border-border bg-background px-3 py-2 text-base text-foreground outline-none focus:border-primary"
      />
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <MarkdownEditor
          value={markdownSource}
          onChange={setMarkdownSource}
          placeholder="Write the lesson text in Markdown…"
        />
      </div>
      <div className="shrink-0 pt-3 border-t border-border flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={handleCreate} disabled={createContent.isPending}>
          {createContent.isPending ? "Adding…" : "Add Text Block"}
        </Button>
      </div>
    </div>
  );
}

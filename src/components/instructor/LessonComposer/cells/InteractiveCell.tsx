"use client";

import { useState } from "react";
import { MonitorPlay } from "lucide-react";

import { Button } from "@/components/ui/shadcn/button";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/context/ConfirmContext";
import { useCreateContent, useUpdateContent, useDeleteContent } from "../contentMutations";
import { CellShell } from "../CellShell";
import { CELL_TYPES } from "../cellTypes";
import { getErrorMessage } from "../getErrorMessage";
import { getContentParent, toParentField, type CellActionProps, type ContentRow, type CreateCellFormProps } from "../types";

const CELL_TYPE = CELL_TYPES.find((c) => c.id === "interactive") || {
  id: "interactive",
  label: "Interactive",
  description: "An embedded interactive widget or simulation (iframe).",
  icon: MonitorPlay,
  contentType: "EMBED",
  supportedByApiToday: true,
};

interface InteractiveCellProps extends CellActionProps {
  content: ContentRow;
}

export function InteractiveCell({
  content,
  onDuplicate,
  isDuplicating,
  badgeText,
  badgeVariant,
  onSettingsSelect,
  onAddAbove,
  onAddBelow,
  isSelected,
}: InteractiveCellProps) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [title, setTitle] = useState(content.title ?? "");
  const [embedUrl, setEmbedUrl] = useState(() => {
    if (content.externalUrl) return content.externalUrl;
    if (content.fileUrl) return content.fileUrl;
    const match = content.htmlContent?.match(/src=["']([^"']+)["']/i);
    return match ? match[1] : "";
  });
  const [height, setHeight] = useState<number>(() => {
    const match = content.htmlContent?.match(/height=["']([^"']+)["']/i);
    return match ? parseInt(match[1], 10) || 600 : 600;
  });

  const updateContent = useUpdateContent();
  const deleteContent = useDeleteContent();
  const confirm = useConfirm();
  const { showToast } = useToast();

  const handleEdit = () => {
    setTitle(content.title ?? "");
    setMode("edit");
  };

  const handleCancel = () => {
    setTitle(content.title ?? "");
    setMode("view");
  };

  const handleSave = async () => {
    try {
      const htmlContent = `<iframe src="${embedUrl}" width="100%" height="${height}" frameborder="0" allowfullscreen></iframe>`;
      await updateContent.mutateAsync({
        contentId: content.id,
        contentData: { title, externalUrl: embedUrl, htmlContent },
        parent: getContentParent(content),
      });
      setMode("view");
    } catch (error) {
      showToast(getErrorMessage(error, "Failed to save interactive block."), "error", "Save failed");
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: "Delete interactive block",
      message: "This will permanently remove this embed from the lesson.",
      confirmText: "Delete",
    });
    if (!confirmed) return;

    try {
      await deleteContent.mutateAsync({ contentId: content.id, parent: getContentParent(content) });
    } catch (error) {
      showToast(getErrorMessage(error, "Failed to delete block."), "error", "Delete failed");
    }
  };

  return (
    <CellShell
      icon={CELL_TYPE.icon}
      typeLabel={CELL_TYPE.label}
      title={content.title || "Interactive Embed"}
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
          <div>
            <label className="block text-sm font-bold text-foreground mb-1">Title (optional)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Simulation / Interactive Widget"
              className="w-full rounded-lg border border-transparent bg-background px-3 py-2 text-base text-foreground outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-foreground mb-1">Embed URL / iframe source *</label>
            <input
              type="url"
              value={embedUrl}
              onChange={(e) => setEmbedUrl(e.target.value)}
              placeholder="https://example.com/interactive"
              className="w-full rounded-lg border border-transparent bg-background px-3 py-2 text-base text-foreground outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-foreground mb-1">Height (px)</label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value) || 600)}
              className="w-24 rounded-lg border border-transparent bg-background px-3 py-2 text-base text-foreground outline-none focus:border-purple-500"
            />
          </div>

          {embedUrl && (
            <div className="space-y-1">
              <span className="text-[13px] font-bold text-muted-foreground">Live Preview:</span>
              <div className="rounded-xl border border-border bg-background p-2 overflow-hidden">
                <iframe
                  src={embedUrl}
                  width="100%"
                  height={height}
                  className="rounded-lg border-0 w-full"
                  allowFullScreen
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={updateContent.isPending || !embedUrl}>
              {updateContent.isPending ? "Saving…" : "Save Embed"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {embedUrl ? (
            <div className="rounded-xl border border-border bg-background overflow-hidden">
              <iframe
                src={embedUrl}
                width="100%"
                height={height}
                className="rounded-lg border-0 w-full"
                allowFullScreen
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No embed URL configured.</p>
          )}
        </div>
      )}
    </CellShell>
  );
}

export function CreateInteractiveForm({ parent, order, onCreated, onCancel }: CreateCellFormProps) {
  const [title, setTitle] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");
  const [height, setHeight] = useState(600);

  const createContent = useCreateContent();
  const { showToast } = useToast();

  const handleCreate = async () => {
    if (!embedUrl) {
      showToast("Please enter an embed URL", "error");
      return;
    }

    try {
      const htmlContent = `<iframe src="${embedUrl}" width="100%" height="${height}" frameborder="0" allowfullscreen></iframe>`;
      await createContent.mutateAsync({
        ...toParentField(parent),
        type: "EMBED",
        order,
        title: title || "Interactive Embed",
        externalUrl: embedUrl,
        htmlContent,
      });
      onCreated();
    } catch (error) {
      showToast(getErrorMessage(error, "Failed to add interactive block."), "error", "Add failed");
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-bold text-foreground mb-1">Title (optional)</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Interactive Simulation"
          className="w-full rounded-lg border border-transparent bg-background px-3 py-2 text-base text-foreground outline-none focus:border-purple-500"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-foreground mb-1">Embed URL / iframe source *</label>
        <input
          type="url"
          value={embedUrl}
          onChange={(e) => setEmbedUrl(e.target.value)}
          placeholder="https://example.com/interactive"
          className="w-full rounded-lg border border-transparent bg-background px-3 py-2 text-base text-foreground outline-none focus:border-purple-500"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-foreground mb-1">Height (px)</label>
        <input
          type="number"
          value={height}
          onChange={(e) => setHeight(Number(e.target.value) || 600)}
          className="w-24 rounded-lg border border-transparent bg-background px-3 py-2 text-base text-foreground outline-none focus:border-purple-500"
        />
      </div>

      {embedUrl && (
        <div className="space-y-1">
          <span className="text-[13px] font-bold text-muted-foreground">Live Preview:</span>
          <div className="rounded-xl border border-border bg-background p-2 overflow-hidden">
            <iframe
              src={embedUrl}
              width="100%"
              height={height}
              className="rounded-lg border-0 w-full"
              allowFullScreen
            />
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={handleCreate} disabled={createContent.isPending || !embedUrl}>
          {createContent.isPending ? "Adding…" : "Add Interactive Embed"}
        </Button>
      </div>
    </div>
  );
}

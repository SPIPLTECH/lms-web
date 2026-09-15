"use client";

import { useRef, useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/shadcn/button";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/context/ConfirmContext";
import { uploadFileToVercelBlob } from "@/services/content.service";

import { useCreateContent, useUpdateContent, useDeleteContent } from "../contentMutations";
import { CellShell } from "../CellShell";
import { CELL_TYPES } from "../cellTypes";
import { getErrorMessage } from "../getErrorMessage";
import { getContentParent, toParentField, type CellActionProps, type ContentRow, type CreateCellFormProps } from "../types";

const CELL_TYPE = CELL_TYPES.find((c) => c.id === "link")!;

interface LinkCellProps extends CellActionProps {
  content: ContentRow;
}

export function LinkCell({
  content,
  onDuplicate,
  isDuplicating,
  badgeText,
  badgeVariant,
  onSettingsSelect,
  onAddAbove,
  onAddBelow,
  isSelected,
}: LinkCellProps) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [title, setTitle] = useState(content.title ?? "");
  const [externalUrl, setExternalUrl] = useState(content.externalUrl ?? "");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateContent = useUpdateContent();
  const deleteContent = useDeleteContent();
  const confirm = useConfirm();
  const { showToast } = useToast();

  const handleEdit = () => {
    setTitle(content.title ?? "");
    setExternalUrl(content.externalUrl ?? "");
    setUploadError(null);
    setIsUploading(false);
    setMode("edit");
  };

  const handleCancel = () => {
    setTitle(content.title ?? "");
    setExternalUrl(content.externalUrl ?? "");
    setUploadError(null);
    setIsUploading(false);
    setMode("view");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsUploading(true);
    try {
      showToast(`Uploading ${file.name} to Vercel Blob...`, "info");
      const result = await uploadFileToVercelBlob(file);
      if (result && result.url) {
        setExternalUrl(result.url);
        showToast("File uploaded to Vercel Blob successfully!", "success");
      } else {
        throw new Error("Invalid response from upload service");
      }
    } catch (error) {
      setUploadError(getErrorMessage(error, "Upload failed. Please try again."));
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      await updateContent.mutateAsync({
        contentId: content.id,
        contentData: { title, externalUrl },
        parent: getContentParent(content),
      });
      setMode("view");
    } catch (error) {
      showToast(getErrorMessage(error, "Failed to save this link."), "error", "Save failed");
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: "Delete link",
      message: "This will permanently remove this content from the lesson.",
      confirmText: "Delete",
    });
    if (!confirmed) return;

    try {
      await deleteContent.mutateAsync({ contentId: content.id, parent: getContentParent(content) });
    } catch (error) {
      showToast(getErrorMessage(error, "Failed to delete this link."), "error", "Delete failed");
    }
  };

  return (
    <CellShell
      icon={CELL_TYPE.icon}
      typeLabel={CELL_TYPE.label}
      title={content.title || "Untitled link"}
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
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              Link Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Link title"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base text-foreground outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              URL / Link Target
            </label>
            <input
              type="text"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base text-foreground outline-none focus:border-primary font-mono"
            />
          </div>

          {/* OR Divider */}
          <div className="relative flex items-center justify-center my-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/60" />
            </div>
            <span className="relative bg-card px-2 text-[12px] font-bold text-muted-foreground uppercase">
              OR
            </span>
          </div>

          {/* Automatic Local File Upload Button */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 hover:bg-primary/20 px-3.5 py-2 text-sm font-bold text-primary transition cursor-pointer disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="size-4 animate-spin text-primary" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="size-4" />
                  <span>Choose File</span>
                </>
              )}
            </button>
          </div>

          {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}

          {externalUrl && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-foreground">
              <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
              <span className="truncate flex-1 font-mono">{externalUrl}</span>
              <button
                type="button"
                onClick={() => setExternalUrl("")}
                className="shrink-0 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                title="Remove URL"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={updateContent.isPending || isUploading || !externalUrl}>
              {updateContent.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      ) : content.externalUrl ? (
        <a
          href={content.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-3 rounded-xl border border-card-border bg-background px-4 py-3 text-base text-foreground transition-colors hover:border-primary/50"
        >
          <span className="truncate">{content.externalUrl}</span>
          <ExternalLink className="size-4 shrink-0 text-primary" />
        </a>
      ) : (
        <p className="text-base italic text-muted-foreground">No URL set yet.</p>
      )}
    </CellShell>
  );
}

export function CreateLinkForm({ parent, order, onCreated, onCancel }: CreateCellFormProps) {
  const [title, setTitle] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createContent = useCreateContent();
  const { showToast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsUploading(true);
    try {
      showToast(`Uploading ${file.name} to Vercel Blob...`, "info");
      const result = await uploadFileToVercelBlob(file);
      if (result && result.url) {
        setExternalUrl(result.url);
        showToast("File uploaded to Vercel Blob successfully!", "success");
      } else {
        throw new Error("Invalid response from upload service");
      }
    } catch (error) {
      setUploadError(getErrorMessage(error, "Upload failed. Please try again."));
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreate = async () => {
    if (!parent?.parentId) {
      showToast("Please select or create a lesson in the left sidebar first.", "error", "Lesson Required");
      return;
    }
    try {
      await createContent.mutateAsync({ ...toParentField(parent), type: "LINK", order, title, externalUrl });
      onCreated();
    } catch (error) {
      showToast(getErrorMessage(error, "Failed to add this link."), "error", "Add failed");
    }
  };

  return (
    <div className="space-y-4 pt-1">
      <div>
        <label className="block text-sm font-semibold text-foreground mb-1.5">
          Link Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Link title"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base text-foreground outline-none focus:border-primary"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-foreground mb-1.5">
          URL / Link Target
        </label>
        <input
          type="text"
          value={externalUrl}
          onChange={(e) => setExternalUrl(e.target.value)}
          placeholder="https://example.com"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base text-foreground outline-none focus:border-primary font-mono"
        />
      </div>

      {/* OR Divider */}
      <div className="relative flex items-center justify-center my-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/60" />
        </div>
        <span className="relative bg-background px-2 text-[12px] font-bold text-muted-foreground uppercase">
          OR
        </span>
      </div>

      {/* Automatic Local File Upload Button */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 hover:bg-primary/20 px-3.5 py-2 text-sm font-bold text-primary transition cursor-pointer disabled:opacity-50"
        >
          {isUploading ? (
            <>
              <Loader2 className="size-4 animate-spin text-primary" />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <Upload className="size-4" />
              <span>Choose File</span>
            </>
          )}
        </button>
      </div>

      {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}

      {externalUrl && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-foreground">
          <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
          <span className="truncate flex-1 font-mono">{externalUrl}</span>
          <button
            type="button"
            onClick={() => setExternalUrl("")}
            className="shrink-0 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            title="Remove URL"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={handleCreate} disabled={createContent.isPending || isUploading || !externalUrl}>
          {createContent.isPending ? "Adding…" : "Add Link"}
        </Button>
      </div>
    </div>
  );
}

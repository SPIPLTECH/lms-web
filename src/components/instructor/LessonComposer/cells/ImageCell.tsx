"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Loader2, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/shadcn/button";
import { getDisplayUrl } from "@/lib/blob";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/context/ConfirmContext";
import { uploadFileToVercelBlob } from "@/services/content.service";

import { useCreateContent, useUpdateContent, useDeleteContent } from "../contentMutations";
import { CellShell } from "../CellShell";
import { CELL_TYPES } from "../cellTypes";
import { getErrorMessage } from "../getErrorMessage";
import { IMAGE_MARKER_CLASS } from "../htmlCellVariant";
import { getContentParent, toParentField, type CellActionProps, type ContentRow, type CreateCellFormProps } from "../types";

const CELL_TYPE = CELL_TYPES.find((c) => c.id === "image")!;

interface ParsedImage {
  src: string;
  alt: string;
  caption: string;
}

function parseImageHtml(htmlContent: string | null | undefined): ParsedImage {
  if (!htmlContent || typeof window === "undefined") return { src: "", alt: "", caption: "" };
  const root = new DOMParser().parseFromString(htmlContent, "text/html").body.firstElementChild;
  const img = root?.querySelector("img");
  const figcaption = root?.querySelector("figcaption");
  return {
    src: img?.getAttribute("src") ?? "",
    alt: img?.getAttribute("alt") ?? "",
    caption: figcaption?.textContent ?? "",
  };
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function buildImageHtml({ src, alt, caption }: ParsedImage): string {
  const figcaption = caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : "";
  return `<figure class="${IMAGE_MARKER_CLASS}"><img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" />${figcaption}</figure>`;
}

interface ImageCellProps extends CellActionProps {
  content: ContentRow;
}

export function ImageCell({
  content,
  onDuplicate,
  isDuplicating,
  badgeText,
  badgeVariant,
  onSettingsSelect,
  onAddAbove,
  onAddBelow,
  isSelected,
}: ImageCellProps) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const parsed = () => parseImageHtml(content.htmlContent);
  const [src, setSrc] = useState(() => parsed().src);
  const [alt, setAlt] = useState(() => parsed().alt);
  const [caption, setCaption] = useState(() => parsed().caption);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateContent = useUpdateContent();
  const deleteContent = useDeleteContent();
  const confirm = useConfirm();
  const { showToast } = useToast();

  const resetFields = () => {
    const p = parseImageHtml(content.htmlContent);
    setSrc(p.src);
    setAlt(p.alt);
    setCaption(p.caption);
    setUploadError(null);
    setIsUploading(false);
  };

  const handleEdit = () => {
    resetFields();
    setMode("edit");
  };

  const handleCancel = () => {
    resetFields();
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
        setSrc(result.url);
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
        contentData: {
          title: alt || content.title || "Image",
          htmlContent: buildImageHtml({ src, alt, caption }),
        },
        parent: getContentParent(content),
      });
      setMode("view");
    } catch (error) {
      showToast(getErrorMessage(error, "Failed to save this image."), "error", "Save failed");
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: "Delete image",
      message: "This will permanently remove this content from the lesson.",
      confirmText: "Delete",
    });
    if (!confirmed) return;

    try {
      await deleteContent.mutateAsync({ contentId: content.id, parent: getContentParent(content) });
    } catch (error) {
      showToast(getErrorMessage(error, "Failed to delete this image."), "error", "Delete failed");
    }
  };

  const view = parseImageHtml(content.htmlContent);

  return (
    <CellShell
      icon={CELL_TYPE.icon}
      typeLabel={CELL_TYPE.label}
      title={content.title || "Untitled image"}
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
          {/* Image URL Field */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              Image URL
            </label>
            <input
              type="text"
              value={src}
              onChange={(e) => setSrc(e.target.value)}
              placeholder="https://example.com/image.jpg"
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
              accept="image/*"
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

          {/* Upload Error */}
          {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}

          {/* Thumbnail Preview */}
          {src && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-foreground">
                <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                <span className="truncate flex-1 font-mono">{src}</span>
                <button
                  type="button"
                  onClick={() => setSrc("")}
                  className="shrink-0 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  title="Remove image"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              <img src={getDisplayUrl(src)} alt={alt || "Preview"} className="max-h-44 rounded-lg border border-card-border object-cover" />
            </div>
          )}

          {/* Caption Input */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              Caption (optional)
            </label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Optional caption"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base text-foreground outline-none focus:border-primary"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={updateContent.isPending || isUploading || !src}
            >
              {updateContent.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      ) : view.src ? (
        <figure className="space-y-2 text-center py-1">
          <img
            src={getDisplayUrl(view.src)}
            alt={view.alt || "Image preview"}
            className="mx-auto max-h-80 w-auto rounded-xl border border-border object-contain shadow-md"
          />
          {view.caption && (
            <figcaption className="text-sm text-muted-foreground italic">{view.caption}</figcaption>
          )}
        </figure>
      ) : (
        <p className="text-sm italic text-muted-foreground">No image set yet.</p>
      )}
    </CellShell>
  );
}

export function CreateImageForm({ parent, order, onCreated, onCancel }: CreateCellFormProps) {
  const [src, setSrc] = useState("");
  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");
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
        setSrc(result.url);
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
      const safeOrder = typeof order === "number" && !isNaN(order) && order > 0 ? order : 1;
      await createContent.mutateAsync({
        ...toParentField(parent),
        type: "HTML",
        order: safeOrder,
        title: alt || "Image",
        htmlContent: buildImageHtml({ src, alt, caption }),
      });
      onCreated();
    } catch (error) {
      showToast(getErrorMessage(error, "Failed to add this image."), "error", "Add failed");
    }
  };

  return (
    <div className="space-y-4 pt-1">
      {/* Image URL Input */}
      <div>
        <label className="block text-sm font-semibold text-foreground mb-1.5">
          Image URL
        </label>
        <input
          type="text"
          value={src}
          onChange={(e) => setSrc(e.target.value)}
          placeholder="https://example.com/image.jpg"
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

      {/* File Selection Button (Triggers Automatic Vercel Blob Upload) */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
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

      {/* Upload Error */}
      {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}

      {/* Image Preview if src is present */}
      {src && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-foreground">
            <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
            <span className="truncate flex-1 font-mono">{src}</span>
            <button
              type="button"
              onClick={() => setSrc("")}
              className="shrink-0 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              title="Remove image"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <img src={getDisplayUrl(src)} alt={alt || "Preview"} className="max-h-40 rounded-lg border border-card-border object-cover" />
        </div>
      )}

      {/* Caption Input */}
      <div>
        <label className="block text-sm font-semibold text-foreground mb-1.5">
          Caption (optional)
        </label>
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Optional caption"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base text-foreground outline-none focus:border-primary"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleCreate}
          disabled={createContent.isPending || isUploading || !src}
        >
          {createContent.isPending ? "Adding…" : "Add Image"}
        </Button>
      </div>
    </div>
  );
}

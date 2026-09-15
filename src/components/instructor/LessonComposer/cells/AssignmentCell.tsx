"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Loader2, Paperclip, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/shadcn/button";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/context/ConfirmContext";
import { getDisplayUrl } from "@/lib/blob";
import { escapeForContentApi, unescapeFromContentApi } from "@/lib/markdown";
import { uploadFileToVercelBlob } from "@/services/content.service";

import { useCreateContent, useUpdateContent, useDeleteContent } from "../contentMutations";
import { CellShell } from "../CellShell";
import { CELL_TYPES } from "../cellTypes";
import { getErrorMessage } from "../getErrorMessage";
import { getContentParent, toParentField, type CellActionProps, type ContentRow, type CreateCellFormProps } from "../types";

const CELL_TYPE = CELL_TYPES.find((c) => c.id === "assignment")!;

/** The shape this cell stores in `Content.data` — just enough to show the real filename again after a reload, since the storage URL itself is a generated blob key, not the name the instructor uploaded. */
interface AssignmentData {
  originalFileName?: string;
}

function readOriginalFileName(data: ContentRow["data"]): string {
  const value = (data as AssignmentData | null | undefined)?.originalFileName;
  return typeof value === "string" ? value : "";
}

/**
 * Human-readable fallback label for a `fileUrl` when no original filename
 * was captured at upload time (rows created before this field existed).
 * Never shows the raw storage key (e.g. a Vercel Blob hash filename) —
 * only a generic, honest label derived from the extension.
 */
function genericFileLabel(fileUrl: string): string {
  const clean = fileUrl.split("?")[0].toLowerCase();
  if (clean.endsWith(".pdf")) return "PDF Document";
  if (clean.endsWith(".doc") || clean.endsWith(".docx")) return "Word Document";
  if (clean.endsWith(".ppt") || clean.endsWith(".pptx")) return "Presentation File";
  if (clean.endsWith(".xls") || clean.endsWith(".xlsx")) return "Spreadsheet";
  if (clean.endsWith(".zip") || clean.endsWith(".rar")) return "Archive File";
  return "Attached Document";
}

/**
 * The Assignment's single "Upload" action — same Vercel Blob upload infra
 * as Document/Presentation cells (see DocumentCell.tsx's
 * PlainFileUploadFields), simplified to one button with no manual URL
 * entry, matching the Assignment design's `[ Upload ]` control. Captures
 * the browser's original filename at upload time (`uploadFileToVercelBlob`
 * already returns it) so the card can show a real name instead of the
 * generated storage key.
 */
function AssignmentUploadField({
  fileUrl,
  fileName,
  onChange,
}: {
  fileUrl: string;
  fileName: string;
  onChange: (next: { fileUrl: string; fileName: string }) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setIsUploading(true);
    try {
      showToast(`Uploading ${file.name}...`, "info");
      const result = await uploadFileToVercelBlob(file);
      if (result?.url) {
        onChange({ fileUrl: result.url, fileName: result.originalName || file.name });
        showToast("File uploaded successfully", "success");
      } else {
        throw new Error("Invalid response from upload service");
      }
    } catch (error) {
      setUploadError(getErrorMessage(error, "Upload failed. Please try again."));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const displayName = fileName || (fileUrl ? genericFileLabel(fileUrl) : "");

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-foreground mb-1.5">Attachment (optional)</label>
      <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" />
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
            <span>Upload</span>
          </>
        )}
      </button>

      {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}

      {fileUrl && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-foreground max-w-full">
          <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
          <a
            href={getDisplayUrl(fileUrl)}
            target="_blank"
            rel="noreferrer"
            title={displayName}
            className="truncate flex-1 min-w-0 hover:underline"
          >
            {displayName}
          </a>
          <button
            type="button"
            onClick={() => onChange({ fileUrl: "", fileName: "" })}
            className="shrink-0 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive cursor-pointer"
            title="Remove attachment"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

interface AssignmentCellProps extends CellActionProps {
  content: ContentRow;
}

/**
 * Renders/edits a `type: "ASSIGNMENT"` Content row — a descriptive
 * assignment (title, instructions, optional reference document), not a
 * Quiz. `htmlContent` carries the plain-text description; it's escaped
 * before sending and decoded after reading for the same reason TextCell
 * does (see src/lib/markdown.js's escapeForContentApi) — the backend runs
 * every Content row's htmlContent through an HTML sanitizer on save.
 */
export function AssignmentCell({
  content,
  onDuplicate,
  isDuplicating,
  badgeText,
  badgeVariant,
  onSettingsSelect,
  onAddAbove,
  onAddBelow,
  isSelected,
}: AssignmentCellProps) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [title, setTitle] = useState(content.title ?? "");
  const [description, setDescription] = useState(() => unescapeFromContentApi(content.htmlContent ?? ""));
  const [fileUrl, setFileUrl] = useState(content.fileUrl ?? "");
  const [fileName, setFileName] = useState(() => readOriginalFileName(content.data));

  const updateContent = useUpdateContent();
  const deleteContent = useDeleteContent();
  const confirm = useConfirm();
  const { showToast } = useToast();

  const resetFromContent = () => {
    setTitle(content.title ?? "");
    setDescription(unescapeFromContentApi(content.htmlContent ?? ""));
    setFileUrl(content.fileUrl ?? "");
    setFileName(readOriginalFileName(content.data));
  };

  const handleEdit = () => {
    resetFromContent();
    setMode("edit");
  };

  const handleCancel = () => {
    resetFromContent();
    setMode("view");
  };

  const handleSave = async () => {
    try {
      await updateContent.mutateAsync({
        contentId: content.id,
        contentData: {
          title: title.trim() || "Assignment",
          htmlContent: escapeForContentApi(description),
          fileUrl,
          data: fileUrl ? { originalFileName: fileName || null } : null,
        },
        parent: getContentParent(content),
      });
      setMode("view");
    } catch (error) {
      showToast(getErrorMessage(error, "Failed to save this assignment."), "error", "Save failed");
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: "Delete assignment",
      message: "This will permanently remove this assignment from the lesson.",
      confirmText: "Delete",
    });
    if (!confirmed) return;

    try {
      await deleteContent.mutateAsync({ contentId: content.id, parent: getContentParent(content) });
    } catch (error) {
      showToast(getErrorMessage(error, "Failed to delete this assignment."), "error", "Delete failed");
    }
  };

  const viewDescription = unescapeFromContentApi(content.htmlContent ?? "");
  const viewFileName = content.fileUrl ? readOriginalFileName(content.data) || genericFileLabel(content.fileUrl) : "";

  return (
    <CellShell
      icon={CELL_TYPE.icon}
      typeLabel={CELL_TYPE.label}
      title={content.title || "Untitled Assignment"}
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
          <AssignmentUploadField
            fileUrl={fileUrl}
            fileName={fileName}
            onChange={(next) => {
              setFileUrl(next.fileUrl);
              setFileName(next.fileName);
            }}
          />

          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Assignment title"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base text-foreground outline-none focus:border-primary font-medium"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what students need to do for this assignment…"
              rows={5}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base text-foreground outline-none focus:border-primary resize-y"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={updateContent.isPending}>
              {updateContent.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {viewDescription && (
            <p className="text-base leading-relaxed text-foreground/90 line-clamp-3 whitespace-pre-line break-words">
              {viewDescription}
            </p>
          )}

          {content.fileUrl && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 max-w-full">
              <Paperclip className="size-3.5 text-amber-400 shrink-0" />
              <a
                href={getDisplayUrl(content.fileUrl)}
                target="_blank"
                rel="noreferrer"
                title={viewFileName}
                className="truncate min-w-0 text-sm font-semibold text-foreground/90 hover:text-primary hover:underline"
              >
                {viewFileName}
              </a>
            </div>
          )}
        </div>
      )}
    </CellShell>
  );
}

/**
 * The "Add Cell" creation form for an Assignment — hosted inside
 * AddCellModal. Persists as a plain `Content` row (`type: "ASSIGNMENT"`)
 * via the existing generic /contents API, attached to whichever
 * Course/Module/Lesson/Topic the Composer is currently on (`parent`,
 * supplied by the caller) — the same hierarchy every other cell type
 * already uses, no separate Assignment/AssignmentSubmission record.
 */
export function CreateAssignmentForm({ parent, order, onCreated, onCancel }: CreateCellFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");

  const createContent = useCreateContent();
  const { showToast } = useToast();

  const handleCreate = async () => {
    if (!parent?.parentId) {
      showToast("Please select or create this item first.", "error", "Selection Required");
      return;
    }
    try {
      await createContent.mutateAsync({
        ...toParentField(parent),
        type: "ASSIGNMENT",
        order,
        title: title.trim() || "Assignment",
        htmlContent: escapeForContentApi(description),
        fileUrl,
        data: fileUrl ? { originalFileName: fileName || null } : null,
      });
      onCreated();
    } catch (error) {
      showToast(getErrorMessage(error, "Failed to create this assignment."), "error", "Create failed");
    }
  };

  return (
    <div className="space-y-4 pt-1">
      <AssignmentUploadField
        fileUrl={fileUrl}
        fileName={fileName}
        onChange={(next) => {
          setFileUrl(next.fileUrl);
          setFileName(next.fileName);
        }}
      />

      <div>
        <label className="block text-sm font-semibold text-foreground mb-1.5">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Assignment title"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base text-foreground outline-none focus:border-primary font-medium"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-foreground mb-1.5">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what students need to do for this assignment…"
          rows={5}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base text-foreground outline-none focus:border-primary resize-y"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={handleCreate} disabled={createContent.isPending}>
          {createContent.isPending ? "Creating…" : "Create Assignment"}
        </Button>
      </div>
    </div>
  );
}

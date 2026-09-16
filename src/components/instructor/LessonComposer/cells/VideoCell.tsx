"use client";

import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/shadcn/button";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/context/ConfirmContext";
import { getYouTubeEmbedUrl, isYouTubeUrl } from "@/lib/youtube";
import { uploadFileToVercelBlob } from "@/services/content.service";

import { getDisplayUrl } from "@/lib/blob";
import { useCreateContent, useUpdateContent, useDeleteContent } from "../contentMutations";
import { CellShell } from "../CellShell";
import { CELL_TYPES } from "../cellTypes";
import { getErrorMessage } from "../getErrorMessage";
import { getContentParent, toParentField, type CellActionProps, type ContentRow, type CreateCellFormProps } from "../types";

const CELL_TYPE = CELL_TYPES.find((c) => c.id === "video")!;

interface VideoCellProps extends CellActionProps {
  content: ContentRow;
}

export function VideoCell({
  content,
  onDuplicate,
  isDuplicating,
  badgeText,
  badgeVariant,
  onSettingsSelect,
  onAddAbove,
  onAddBelow,
  isSelected,
}: VideoCellProps) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [title, setTitle] = useState(content.title ?? "");
  const [videoUrl, setVideoUrl] = useState(content.videoUrl ?? "");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // A <video> whose source will not decode collapses into the browser's own
  // broken-media box on a black background, which reads as a broken page
  // rather than a broken file. Track the failure so we can say which it is.
  const [playbackFailed, setPlaybackFailed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateContent = useUpdateContent();
  const deleteContent = useDeleteContent();
  const confirm = useConfirm();
  const { showToast } = useToast();

  const handleEdit = () => {
    setTitle(content.title ?? "");
    setVideoUrl(content.videoUrl ?? "");
    setUploadError(null);
    setIsUploading(false);
    setMode("edit");
  };

  const handleCancel = () => {
    setTitle(content.title ?? "");
    setVideoUrl(content.videoUrl ?? "");
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
        setVideoUrl(result.url);
        showToast("Video uploaded to Vercel Blob successfully!", "success");
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
        contentData: { title, videoUrl },
        parent: getContentParent(content),
      });
      // A new source deserves a fresh attempt — otherwise fixing a bad URL
      // would still show the previous failure.
      setPlaybackFailed(false);
      setMode("view");
    } catch (error) {
      showToast(getErrorMessage(error, "Failed to save this video."), "error", "Save failed");
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: "Delete video",
      message: "This will permanently remove this content from the lesson.",
      confirmText: "Delete",
    });
    if (!confirmed) return;

    try {
      await deleteContent.mutateAsync({ contentId: content.id, parent: getContentParent(content) });
    } catch (error) {
      showToast(getErrorMessage(error, "Failed to delete this video."), "error", "Delete failed");
    }
  };

  const embedUrl = content.videoUrl && isYouTubeUrl(content.videoUrl)
    ? getYouTubeEmbedUrl(content.videoUrl)
    : null;

  return (
    <CellShell
      icon={CELL_TYPE.icon}
      typeLabel={CELL_TYPE.label}
      title={content.title || "Untitled video"}
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
              Video Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Video title"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base text-foreground outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              Video URL
            </label>
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=… or direct video file URL"
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

          {/* Automatic Local Video Upload Button */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
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
                  <span>Choose Video File</span>
                </>
              )}
            </button>
          </div>

          {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}

          {videoUrl && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-foreground">
              <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
              <span className="truncate flex-1 font-mono">{videoUrl}</span>
              <button
                type="button"
                onClick={() => setVideoUrl("")}
                className="shrink-0 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                title="Remove video URL"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={updateContent.isPending || isUploading || !videoUrl}>
              {updateContent.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      ) : content.videoUrl ? (
        <div className="space-y-3 py-1">
          {/* Controlled Playable Video Player. YouTube embeds are always
              16:9 by convention, so that case keeps a fixed aspect-ratio
              frame. An uploaded file's real aspect ratio is unknown ahead of
              time, so it sizes itself to its own natural dimensions instead
              of being forced into a 16:9 box — forcing one there just
              letterboxes non-16:9 footage into a tiny, mostly-black frame. */}
          <div
            className={`mx-auto w-full max-w-2xl overflow-hidden rounded-xl border border-border shadow-lg ${
              playbackFailed && !embedUrl ? "bg-card" : "bg-black"
            }`}
          >
            {embedUrl ? (
              <div className="relative aspect-video w-full">
                <iframe
                  src={embedUrl}
                  title={content.title || "Video Player"}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full rounded-xl border-0"
                />
              </div>
            ) : playbackFailed ? (
              /* Named as a source problem, not rendered as a broken page. The
                 URL is shown because it is usually the thing that is wrong. */
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <AlertTriangle className="size-6 text-amber-600 dark:text-amber-400" />
                <p className="text-base font-semibold text-foreground">This video couldn&apos;t be played</p>
                <p className="text-sm text-muted-foreground">
                  The file may be missing, still uploading, or not a format this browser supports.
                </p>
                <code className="mt-1 block max-w-full truncate rounded bg-muted px-2 py-1 text-[13px] text-muted-foreground">
                  {content.videoUrl}
                </code>
              </div>
            ) : (
              <video
                src={getDisplayUrl(content.videoUrl)}
                controls
                preload="metadata"
                onError={() => setPlaybackFailed(true)}
                className="block w-full h-auto max-h-[70vh] rounded-xl"
              />
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm italic text-muted-foreground">No video URL set yet.</p>
      )}
    </CellShell>
  );
}

export function CreateVideoForm({ parent, order, onCreated, onCancel }: CreateCellFormProps) {
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
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
        setVideoUrl(result.url);
        showToast("Video uploaded to Vercel Blob successfully!", "success");
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
      await createContent.mutateAsync({ ...toParentField(parent), type: "VIDEO", order, title, videoUrl });
      onCreated();
    } catch (error) {
      showToast(getErrorMessage(error, "Failed to add this video."), "error", "Add failed");
    }
  };

  return (
    <div className="space-y-4 pt-1">
      <div>
        <label className="block text-sm font-semibold text-foreground mb-1.5">
          Video Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Video title"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base text-foreground outline-none focus:border-primary"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-foreground mb-1.5">
          Video URL
        </label>
        <input
          type="text"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://youtube.com/watch?v=… or direct video file URL"
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

      {/* Automatic Local Video Upload Button */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
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
              <span>Choose Video File</span>
            </>
          )}
        </button>
      </div>

      {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}

      {videoUrl && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-foreground">
          <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
          <span className="truncate flex-1 font-mono">{videoUrl}</span>
          <button
            type="button"
            onClick={() => setVideoUrl("")}
            className="shrink-0 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            title="Remove video URL"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={handleCreate} disabled={createContent.isPending || isUploading || !videoUrl}>
          {createContent.isPending ? "Adding…" : "Add Video"}
        </Button>
      </div>
    </div>
  );
}

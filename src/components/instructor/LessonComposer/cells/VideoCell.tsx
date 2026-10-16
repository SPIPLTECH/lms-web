"use client";

import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, Loader2, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/shadcn/button";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/context/ConfirmContext";
import { resolveVideoSource } from "@/lib/videoSource";
import { isYouTubeUrl } from "@/lib/youtube";
import VideoSurface from "@/components/shared/video/VideoSurface";
import { uploadFileToVercelBlob } from "@/services/content.service";

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

  // Same resolver the student learn page uses, so this preview and the
  // student's player can never disagree about how a row renders.
  const videoSource = resolveVideoSource(content);
  const isEmbed = videoSource.kind === "youtube" || videoSource.kind === "vimeo";
  // A YouTube link with no video id in it is a source problem in exactly the
  // same way a file that won't decode is, so it reuses the one state the cell
  // already has for saying so rather than getting a second error surface.
  const hasSourceError = playbackFailed || videoSource.kind === "invalid";

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

          {/* Upload leads, and the URL field sits below the divider, because
              the source decides what the player looks like: a file we host
              plays in our own <video> element with no title, no share control
              and no third-party branding, and a YouTube link cannot — that
              chrome is drawn by YouTube inside a cross-origin iframe and no
              embed parameter turns it off (see VideoSurface for the detail). */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              Video File
            </label>
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
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/10 hover:bg-primary/20 px-3.5 py-2.5 text-sm font-bold text-primary transition cursor-pointer disabled:opacity-50"
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
            <p className="mt-1.5 text-[12px] text-muted-foreground">
              Plays in Orange Tree&apos;s own player — no title, no share button, no outside branding.
            </p>
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

          <div>
            <label className="block text-sm font-semibold text-muted-foreground mb-1.5">
              Video URL
            </label>
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtu.be/… or a direct .mp4 link"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base text-foreground outline-none focus:border-primary font-mono"
            />
            {/* Named only once the instructor has actually typed a YouTube
                link, so the warning arrives with the decision instead of
                sitting on the form telling everyone off in advance. */}
            {isYouTubeUrl(videoUrl) ? (
              <p className="mt-1.5 flex items-start gap-1.5 text-[12px] text-muted-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>
                  YouTube plays this in its own player, which always shows the video title, a share
                  button and a &ldquo;Watch on YouTube&rdquo; link. Those can&apos;t be turned off —
                  upload the file above for a player without them.
                </span>
              </p>
            ) : (
              <p className="mt-1.5 text-[12px] text-muted-foreground">
                A direct file link plays in our own player. A YouTube link keeps YouTube&apos;s player.
              </p>
            )}
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
      ) : videoSource.kind !== "none" ? (
        <div className="space-y-3 py-1">
          {/* Controlled Playable Video Player. YouTube embeds are always
              16:9 by convention, so that case keeps a fixed aspect-ratio
              frame. An uploaded file's real aspect ratio is unknown ahead of
              time, so it sizes itself to its own natural dimensions instead
              of being forced into a 16:9 box — forcing one there just
              letterboxes non-16:9 footage into a tiny, mostly-black frame. */}
          <div
            className={`mx-auto w-full max-w-2xl overflow-hidden rounded-xl border border-border shadow-lg ${
              hasSourceError && !isEmbed ? "bg-card" : "bg-black"
            }`}
          >
            {isEmbed ? (
              /* The embed fills the frame — the cell's own header above is
                 the editing affordance, so nothing repeats the title here. */
              <VideoSurface
                source={videoSource}
                title={content.title || "Video"}
                className="relative aspect-video w-full overflow-hidden rounded-xl [&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:h-full [&_iframe]:w-full [&_iframe]:rounded-xl [&_iframe]:border-0"
              />
            ) : hasSourceError ? (
              /* Named as a source problem, not rendered as a broken page. The
                 URL is shown because it is usually the thing that is wrong. */
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <AlertTriangle className="size-6 text-amber-600 dark:text-amber-400" />
                <p className="text-base font-semibold text-foreground">
                  {videoSource.kind === "invalid"
                    ? "This YouTube link has no video in it"
                    : "This video couldn't be played"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {videoSource.kind === "invalid"
                    ? "Playlist and channel links can't be embedded. Paste the link to a single video."
                    : "The file may be missing, still uploading, or not a format this browser supports."}
                </p>
                <code className="mt-1 block max-w-full truncate rounded bg-muted px-2 py-1 text-[13px] text-muted-foreground">
                  {videoSource.url}
                </code>
              </div>
            ) : (
              /* Our own hosted media: a real <video> the application fully
                 controls — play, pause, seek, volume, fullscreen, and no
                 third-party chrome of any kind. */
              <VideoSurface
                source={videoSource}
                title={content.title || "Video"}
                onError={() => setPlaybackFailed(true)}
                className="w-full"
                videoClassName="block w-full h-auto max-h-[70vh] rounded-xl"
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

      {/* Same ordering as the edit form above, and for the same reason: the
          uploaded-file path is the only one that yields a player with nothing
          in it but the video. */}
      <div>
        <label className="block text-sm font-semibold text-foreground mb-1.5">
          Video File
        </label>
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
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/10 hover:bg-primary/20 px-3.5 py-2.5 text-sm font-bold text-primary transition cursor-pointer disabled:opacity-50"
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
        <p className="mt-1.5 text-[12px] text-muted-foreground">
          Plays in Orange Tree&apos;s own player — no title, no share button, no outside branding.
        </p>
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

      <div>
        <label className="block text-sm font-semibold text-muted-foreground mb-1.5">
          Video URL
        </label>
        <input
          type="text"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://youtu.be/… or a direct .mp4 link"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base text-foreground outline-none focus:border-primary font-mono"
        />
        {isYouTubeUrl(videoUrl) ? (
          <p className="mt-1.5 flex items-start gap-1.5 text-[12px] text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              YouTube plays this in its own player, which always shows the video title, a share
              button and a &ldquo;Watch on YouTube&rdquo; link. Those can&apos;t be turned off —
              upload the file above for a player without them.
            </span>
          </p>
        ) : (
          <p className="mt-1.5 text-[12px] text-muted-foreground">
            A direct file link plays in our own player. A YouTube link keeps YouTube&apos;s player.
          </p>
        )}
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

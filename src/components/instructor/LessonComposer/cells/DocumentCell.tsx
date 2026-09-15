"use client";

import { useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Layers,
  Loader2,
  Upload,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/shadcn/button";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/context/ConfirmContext";
import { getDisplayUrl } from "@/lib/blob";
import { uploadFileToVercelBlob } from "@/services/content.service";
import { PdfViewer, PptViewer, ExternalDocumentViewer } from "@/components/shared/LazyDocumentViewers";

import { useCreateContent, useUpdateContent, useDeleteContent } from "../contentMutations";
import { CellShell } from "../CellShell";
import { getErrorMessage } from "../getErrorMessage";
import { PresentationSlidesEditor, createDefaultSlideDeck, parseSlideDeckJson, type SlideItemV2 } from "./PresentationSlidesEditor";
import { PresentationUploadPanel } from "./PresentationUploadPanel";
import { SlideColumnsView } from "./slideCanvas/SlideColumnsLayout";
import type { CellTypeDefinition } from "../cellTypes";
import { getContentParent, toParentField, type CellActionProps, type ContentRow, type CreateCellFormProps } from "../types";

interface DocumentCellProps extends CellActionProps {
  content: ContentRow;
  cellType: CellTypeDefinition;
}

/** Plain "upload a file" fields — used by Document/PDF, which have no slideshow concept and no Upload/External URL/Google Drive source distinction. Presentation's "Upload PPTX" choice uses PresentationUploadPanel instead, which validates the file is really a .pptx and supports all three source types. */
function PlainFileUploadFields({
  fileUrl,
  onFileUrlChange,
  accept,
  placeholder = "https://example.com/file.pdf",
}: {
  fileUrl: string;
  onFileUrlChange: (url: string) => void;
  accept?: string;
  placeholder?: string;
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
        onFileUrlChange(result.url);
        showToast("File uploaded successfully", "success");
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

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-semibold text-foreground mb-1.5">File URL</label>
        <input
          type="text"
          value={fileUrl}
          onChange={(e) => onFileUrlChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base text-foreground outline-none focus:border-primary font-mono"
        />
      </div>

      <div className="relative flex items-center justify-center my-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/60" />
        </div>
        <span className="relative bg-card px-2 text-[12px] font-bold text-muted-foreground uppercase">OR</span>
      </div>

      <div>
        <input ref={fileInputRef} type="file" accept={accept} onChange={handleFileChange} className="hidden" />
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

      {fileUrl && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-foreground">
          <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
          <span className="truncate flex-1 font-mono">{fileUrl}</span>
          <button
            type="button"
            onClick={() => onFileUrlChange("")}
            className="shrink-0 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive cursor-pointer"
            title="Remove file URL"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

/** The two-way "how do you want to create it" tabs — Presentation only. Document/PDF have no slideshow concept, so they never render this. */
function PresentationModeTabs({
  presentationMode,
  onChange,
}: {
  presentationMode: "slideshow" | "upload";
  onChange: (mode: "slideshow" | "upload") => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-background p-1.5">
      <button
        type="button"
        onClick={() => onChange("slideshow")}
        className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-bold transition cursor-pointer ${
          presentationMode === "slideshow"
            ? "bg-primary text-slate-950 shadow-md"
            : "text-muted-foreground hover:text-foreground hover:bg-background"
        }`}
      >
        <Layers size={14} />
        <span>Create Slides</span>
      </button>

      <button
        type="button"
        onClick={() => onChange("upload")}
        className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-bold transition cursor-pointer ${
          presentationMode === "upload"
            ? "bg-primary text-slate-950 shadow-md"
            : "text-muted-foreground hover:text-foreground hover:bg-background"
        }`}
      >
        <Upload size={14} />
        <span>Upload PPTX</span>
      </button>
    </div>
  );
}

export function DocumentCell({
  content,
  cellType,
  onDuplicate,
  isDuplicating,
  badgeText,
  badgeVariant,
  onSettingsSelect,
  onAddAbove,
  onAddBelow,
  isSelected,
}: DocumentCellProps) {
  const isPresentation = cellType.id === "presentation";
  const [mode, setMode] = useState<"view" | "edit">("view");

  const parsedSlides = parseSlideDeckJson(content.htmlContent || content.body);
  const hasSlides = parsedSlides.length > 0;
  const hasFile = Boolean(content.fileUrl && content.fileUrl.trim());

  const [presentationMode, setPresentationMode] = useState<"slideshow" | "upload">(
    hasSlides ? "slideshow" : "upload"
  );

  const [title, setTitle] = useState(content.title ?? "");
  const [fileUrl, setFileUrl] = useState(content.fileUrl ?? "");
  const [slides, setSlides] = useState<SlideItemV2[]>(hasSlides ? parsedSlides : createDefaultSlideDeck());
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [pdfControls, setPdfControls] = useState<React.ReactNode | null>(null);

  const updateContent = useUpdateContent();
  const deleteContent = useDeleteContent();
  const confirm = useConfirm();
  const { showToast } = useToast();

  const handleEdit = () => {
    setTitle(content.title ?? "");
    setFileUrl(content.fileUrl ?? "");
    setPresentationMode(hasSlides ? "slideshow" : "upload");
    setMode("edit");
  };

  const handleCancel = () => {
    setTitle(content.title ?? "");
    setFileUrl(content.fileUrl ?? "");
    setMode("view");
  };

  const handleSave = async () => {
    const useSlideshow = isPresentation && presentationMode === "slideshow";
    try {
      const payload = useSlideshow
        ? { title: title || "Presentation", htmlContent: JSON.stringify(slides), fileUrl: "" }
        : { title: title || cellType.label, fileUrl, htmlContent: "" };

      await updateContent.mutateAsync({ contentId: content.id, contentData: payload, parent: getContentParent(content) });
      setMode("view");
    } catch (error) {
      showToast(getErrorMessage(error, "Failed to save."), "error", "Save failed");
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: `Delete ${cellType.label.toLowerCase()}`,
      message: "This will permanently remove this content from the lesson.",
      confirmText: "Delete",
    });
    if (!confirmed) return;

    try {
      await deleteContent.mutateAsync({ contentId: content.id, parent: getContentParent(content) });
    } catch (error) {
      showToast(getErrorMessage(error, "Failed to delete this file."), "error", "Delete failed");
    }
  };

  const displayUrl = getDisplayUrl(content.fileUrl ?? "");
  const cleanUrl = (content.fileUrl || "").split("?")[0].toLowerCase();
  const ext = cleanUrl.split(".").pop() || "";
  const isPdf = ext === "pdf" || (content.fileUrl || "").toLowerCase().includes(".pdf");
  const isDoc = ext === "doc" || ext === "docx";
  const isPpt = ext === "ppt" || ext === "pptx";
  const isXls = ext === "xls" || ext === "xlsx";

  let detectedBadgeText = "DOC";
  let detectedTypeLabel = cellType.label;

  if (isPdf) {
    detectedBadgeText = "PDF";
    detectedTypeLabel = "PDF Document";
  } else if (isDoc) {
    detectedBadgeText = "DOC";
    detectedTypeLabel = "Word Document";
  } else if (isPpt) {
    detectedBadgeText = "PPT";
    detectedTypeLabel = "Presentation";
  } else if (isXls) {
    detectedBadgeText = "XLS";
    detectedTypeLabel = "Spreadsheet";
  } else if (ext) {
    detectedBadgeText = ext.toUpperCase();
    detectedTypeLabel = `${ext.toUpperCase()} Document`;
  }

  const currentSlide = slides[activeSlideIndex] || slides[0];
  const showSlideDeck = isPresentation && hasSlides;

  return (
    <CellShell
      icon={cellType.icon}
      typeLabel={detectedTypeLabel}
      title={content.title || `Untitled ${detectedTypeLabel}`}
      mode={mode}
      onEdit={handleEdit}
      onDelete={handleDelete}
      isDeleting={deleteContent.isPending}
      onDuplicate={onDuplicate}
      isDuplicating={isDuplicating}
      badgeText={badgeText || detectedBadgeText}
      badgeVariant={badgeVariant || "document"}
      headerActions={isPdf && mode === "view" ? pdfControls : null}
      onSettingsSelect={onSettingsSelect}
      onAddAbove={onAddAbove}
      onAddBelow={onAddBelow}
      isSelected={isSelected}
    >
      {mode === "edit" ? (
        <div className="space-y-4">
          {isPresentation && (
            <PresentationModeTabs presentationMode={presentationMode} onChange={setPresentationMode} />
          )}

          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              {cellType.label} Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`${cellType.label} title`}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base text-foreground outline-none focus:border-primary font-medium"
            />
          </div>

          {isPresentation && presentationMode === "slideshow" ? (
            <PresentationSlidesEditor slides={slides} onChange={setSlides} />
          ) : isPresentation ? (
            <PresentationUploadPanel fileUrl={fileUrl} onFileUrlChange={setFileUrl} />
          ) : (
            <PlainFileUploadFields
              fileUrl={fileUrl}
              onFileUrlChange={setFileUrl}
              placeholder="https://example.com/file.pdf"
            />
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={
                updateContent.isPending ||
                (!(isPresentation && presentationMode === "slideshow") && !fileUrl)
              }
            >
              {updateContent.isPending ? "Saving…" : "Done"}
            </Button>
          </div>
        </div>
      ) : showSlideDeck ? (
        <div className="space-y-2">
          {currentSlide && (
            <SlideColumnsView
              title={currentSlide.title}
              columns={currentSlide.columns}
              backgroundColor={currentSlide.backgroundColor}
            />
          )}

          {slides.length > 1 && (
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setActiveSlideIndex(Math.max(0, activeSlideIndex - 1))}
                disabled={activeSlideIndex === 0}
                className="flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-sm font-bold text-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 cursor-pointer shrink-0"
                aria-label="Previous slide"
              >
                <ChevronLeft size={13} />
              </button>

              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[13px] font-bold text-muted-foreground shrink-0">
                  {activeSlideIndex + 1} / {slides.length}
                </span>
                <div className="flex items-center gap-1 overflow-x-auto">
                  {slides.map((_, dotIdx) => (
                    <button
                      key={dotIdx}
                      type="button"
                      onClick={() => setActiveSlideIndex(dotIdx)}
                      className={`h-1.5 rounded-full transition-all cursor-pointer shrink-0 ${
                        activeSlideIndex === dotIdx ? "w-4 bg-primary" : "w-1.5 bg-slate-700 hover:bg-slate-500"
                      }`}
                      title={`Go to slide ${dotIdx + 1}`}
                    />
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveSlideIndex(Math.min(slides.length - 1, activeSlideIndex + 1))}
                disabled={activeSlideIndex === slides.length - 1}
                className="flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-sm font-bold text-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 cursor-pointer shrink-0"
                aria-label="Next slide"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>
      ) : content.fileUrl ? (
        <div className="w-full">
          {isPdf ? (
            <PdfViewer
              fileUrl={displayUrl}
              title={content.title || cellType.label}
              hideToolbar={true}
              onControlsRender={setPdfControls}
            />
          ) : isPpt && (content.fileUrl.includes("blob.vercel-storage.com") || content.fileUrl.includes("/content-uploads/")) ? (
            <PptViewer
              fileUrl={displayUrl}
              title={content.title || cellType.label}
              hideToolbar={true}
              onControlsRender={setPdfControls}
            />
          ) : (
            <ExternalDocumentViewer
              fileUrl={content.fileUrl}
              title={content.title || cellType.label}
              hideToolbar={true}
              onControlsRender={setPdfControls}
            />
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
          <Layers className="h-7 w-7 text-muted-foreground" />
          <p className="text-sm font-bold text-foreground">No presentation file or slides configured yet</p>
          <p className="text-[13px] text-muted-foreground max-w-xs">
            Upload a PowerPoint file (.pptx) or build slide deck.
          </p>
          <Button type="button" size="sm" onClick={handleEdit} className="mt-1 font-bold">
            Configure Presentation
          </Button>
        </div>
      )}
    </CellShell>
  );
}

interface CreateFileFormProps extends CreateCellFormProps {
  cellType: CellTypeDefinition;
  accept?: string;
  /** For Presentation only — which workflow the instructor already chose in the Add Content modal's "Add Presentation" step. Ignored for Document/PDF, which are always a plain file upload. */
  presentationMode?: "slideshow" | "upload";
}

export function CreateFileForm({ parent, order, cellType, accept, presentationMode = "upload", onCreated, onCancel }: CreateFileFormProps) {
  const isPresentation = cellType.id === "presentation";
  const useSlideshow = isPresentation && presentationMode === "slideshow";

  const [title, setTitle] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [slides, setSlides] = useState<SlideItemV2[]>(createDefaultSlideDeck());

  const createContent = useCreateContent();
  const { showToast } = useToast();

  const handleCreate = async () => {
    if (!parent?.parentId) {
      showToast("Please select or create a topic in the left sidebar first.", "error", "Topic Required");
      return;
    }
    try {
      const safeOrder = typeof order === "number" && !isNaN(order) && order > 0 ? order : 1;
      const payload = useSlideshow
        ? {
            ...toParentField(parent),
            type: cellType.contentType,
            order: safeOrder,
            title: title || "Presentation",
            htmlContent: JSON.stringify(slides),
            fileUrl: "",
          }
        : {
            ...toParentField(parent),
            type: cellType.contentType,
            order: safeOrder,
            title: title || cellType.label,
            fileUrl,
            htmlContent: "",
          };

      await createContent.mutateAsync(payload);
      onCreated();
    } catch (error) {
      showToast(getErrorMessage(error, `Failed to add this ${cellType.label.toLowerCase()}.`), "error", "Add failed");
    }
  };

  return (
    <div className="space-y-4 pt-1">
      <div>
        <label className="block text-sm font-semibold text-foreground mb-1.5">{cellType.label} Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={`${cellType.label} title`}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base text-foreground outline-none focus:border-primary font-medium"
        />
      </div>

      {useSlideshow ? (
        <PresentationSlidesEditor slides={slides} onChange={setSlides} />
      ) : isPresentation ? (
        <PresentationUploadPanel fileUrl={fileUrl} onFileUrlChange={setFileUrl} />
      ) : (
        <PlainFileUploadFields
          fileUrl={fileUrl}
          onFileUrlChange={setFileUrl}
          accept={accept}
          placeholder="https://example.com/file.pdf"
        />
      )}

      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleCreate}
          disabled={createContent.isPending || (!useSlideshow && !fileUrl)}
        >
          {createContent.isPending ? "Adding…" : "Done"}
        </Button>
      </div>
    </div>
  );
}

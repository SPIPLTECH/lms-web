"use client";

import { useRef, useState, useEffect, type DragEvent } from "react";
import { CheckCircle2, Loader2, Upload, X } from "lucide-react";

import { useToast } from "@/components/ui/ToastProvider";
import { uploadFileToVercelBlob } from "@/services/content.service";
import { classifyExternalFile } from "@/lib/external/classifyExternalFile";
import { hasPptxSlides } from "@/lib/pptxParser";
import { getErrorMessage } from "../getErrorMessage";

type PresentationSourceType = "UPLOAD" | "EXTERNAL_URL" | "GOOGLE_DRIVE";

interface PresentationUploadPanelProps {
  fileUrl: string;
  onFileUrlChange: (url: string) => void;
}

/**
 * Dynamic Presentation Source Input Panel.
 * Supports 3 dynamic input modes via a single compact Source selector:
 * 1. UPLOAD: Upload PPT/PPTX file via Vercel Blob
 * 2. EXTERNAL_URL: Direct PPT/PPTX URL (validated)
 * 3. GOOGLE_DRIVE: Google Drive presentation link (validated)
 */
export function PresentationUploadPanel({ fileUrl, onFileUrlChange }: PresentationUploadPanelProps) {
  // Determine initial source type based on existing fileUrl
  const getInitialSourceType = (url: string): PresentationSourceType => {
    if (!url) return "UPLOAD";
    const classified = classifyExternalFile(url);
    if (classified.provider === "GOOGLE_DRIVE") {
      return "GOOGLE_DRIVE";
    }
    if (
      classified.provider === "DIRECT_URL" &&
      (classified.fileType === "PPT" ||
        classified.fileType === "PPTX" ||
        url.toLowerCase().endsWith(".ppt") ||
        url.toLowerCase().endsWith(".pptx"))
    ) {
      return "EXTERNAL_URL";
    }
    if (url.startsWith("http://") || url.startsWith("https://")) {
      if (!url.includes("blob.vercel-storage.com") && !url.includes("/content-uploads/")) {
        return "EXTERNAL_URL";
      }
    }
    return "UPLOAD";
  };

  const [sourceType, setSourceType] = useState<PresentationSourceType>(() => getInitialSourceType(fileUrl));
  const [urlInput, setUrlInput] = useState<string>(fileUrl ?? "");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  // Sync state when fileUrl prop changes externally
  useEffect(() => {
    if (fileUrl) {
      const initialType = getInitialSourceType(fileUrl);
      setSourceType((prev) => (prev !== initialType && fileUrl !== urlInput ? initialType : prev));
      if (fileUrl !== urlInput) {
        setUrlInput(fileUrl);
      }
    }
  }, [fileUrl]);

  // Upload handler for UPLOAD mode
  const doUpload = async (file: File) => {
    setUploadError(null);
    setIsUploading(true);
    setFileName(file.name);

    // The <input accept> hint and this handler's own drag-and-drop path can
    // both be bypassed (native "All Files" picker, or dropping anything),
    // so a wrong file — or a legacy binary .ppt, which isn't a zip at all —
    // would otherwise upload fine and only fail later when a student opens
    // it, deep inside the viewer's parser. Check the actual bytes now.
    const buffer = await file.arrayBuffer();
    if (!(await hasPptxSlides(buffer))) {
      setUploadError("This doesn't look like a valid .pptx file with slides. Legacy .ppt files aren't supported for in-browser preview — please save the file as .pptx and try again.");
      setIsUploading(false);
      setFileName(null);
      return;
    }

    try {
      const result = await uploadFileToVercelBlob(file);
      if (result?.url) {
        onFileUrlChange(result.url);
        setUrlInput(result.url);
        showToast("Presentation uploaded", "success");
      } else {
        throw new Error("Invalid response from upload service");
      }
    } catch (error) {
      setUploadError(getErrorMessage(error, "Upload failed. Please try again."));
      setFileName(null);
      onFileUrlChange("");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) doUpload(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) doUpload(file);
  };

  // Switch source mode
  const handleSourceTypeChange = (newType: PresentationSourceType) => {
    setSourceType(newType);
    setValidationError(null);
    setUploadError(null);

    if (newType === "UPLOAD") {
      // If currently holding an uploaded file, retain it, else clear
      const isUploadUrl = urlInput.includes("blob.vercel-storage.com") || urlInput.includes("/content-uploads/");
      if (!isUploadUrl) {
        setUrlInput("");
        onFileUrlChange("");
      }
    } else if (newType === "EXTERNAL_URL") {
      const classified = classifyExternalFile(urlInput);
      const isExternalPpt =
        classified.isValid &&
        classified.provider === "DIRECT_URL" &&
        (classified.fileType === "PPT" ||
          classified.fileType === "PPTX" ||
          urlInput.toLowerCase().endsWith(".ppt") ||
          urlInput.toLowerCase().endsWith(".pptx"));

      if (isExternalPpt) {
        onFileUrlChange(urlInput);
      } else {
        setUrlInput("");
        onFileUrlChange("");
      }
    } else if (newType === "GOOGLE_DRIVE") {
      const classified = classifyExternalFile(urlInput);
      if (classified.isValid && classified.provider === "GOOGLE_DRIVE") {
        onFileUrlChange(urlInput);
      } else {
        setUrlInput("");
        onFileUrlChange("");
      }
    }
  };

  // Validation handler for EXTERNAL_URL mode
  const handleExternalUrlInput = (value: string) => {
    setUrlInput(value);
    setValidationError(null);
    const trimmed = value.trim();

    if (!trimmed) {
      onFileUrlChange("");
      return;
    }

    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      setValidationError("URL must start with http:// or https://");
      onFileUrlChange("");
      return;
    }

    const classified = classifyExternalFile(trimmed);
    const isPptExt =
      trimmed.toLowerCase().includes(".ppt") ||
      trimmed.toLowerCase().includes(".pptx") ||
      classified.fileType === "PPT" ||
      classified.fileType === "PPTX";

    if (!classified.isValid || !isPptExt) {
      setValidationError("Enter a valid PPT or PPTX URL.");
      onFileUrlChange("");
      return;
    }

    // Valid direct PPT/PPTX URL
    setValidationError(null);
    onFileUrlChange(trimmed);
  };

  // Validation handler for GOOGLE_DRIVE mode
  const handleGoogleDriveInput = (value: string) => {
    setUrlInput(value);
    setValidationError(null);
    const trimmed = value.trim();

    if (!trimmed) {
      onFileUrlChange("");
      return;
    }

    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      setValidationError("URL must start with http:// or https://");
      onFileUrlChange("");
      return;
    }

    const classified = classifyExternalFile(trimmed);
    if (!classified.isValid || classified.provider !== "GOOGLE_DRIVE") {
      setValidationError("Enter a valid Google Drive presentation link.");
      onFileUrlChange("");
      return;
    }

    // Valid Google Drive presentation link
    setValidationError(null);
    onFileUrlChange(trimmed);
  };

  return (
    <div className="space-y-3">
      {/* Compact Source Selector */}
      <div>
        <label className="block text-sm font-semibold text-foreground mb-1.5">Source</label>
        <select
          value={sourceType}
          onChange={(e) => handleSourceTypeChange(e.target.value as PresentationSourceType)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base text-foreground outline-none focus:border-primary font-medium cursor-pointer"
        >
          <option value="UPLOAD">Upload File</option>
          <option value="EXTERNAL_URL">External URL</option>
          <option value="GOOGLE_DRIVE">Google Drive</option>
        </select>
      </div>

      {/* SINGLE DYNAMIC SOURCE INPUT AREA */}
      {sourceType === "UPLOAD" && (
        <div className="space-y-2">
          {fileUrl && !isUploading && (fileUrl.includes("blob.vercel-storage.com") || fileUrl.includes("/content-uploads/")) ? (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5 text-sm text-foreground">
              <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
              <span className="truncate flex-1 font-medium">{fileName || "Presentation uploaded"}</span>
              <button
                type="button"
                onClick={() => {
                  onFileUrlChange("");
                  setUrlInput("");
                  setFileName(null);
                }}
                className="shrink-0 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                title="Remove file"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition cursor-pointer ${
                isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 bg-background/40"
              }`}
            >
              <input ref={fileInputRef} type="file" accept=".pptx" onChange={handleFileChange} className="hidden" />
              {isUploading ? (
                <>
                  <Loader2 className="size-6 animate-spin text-primary" />
                  <p className="text-sm font-bold text-foreground">Uploading {fileName}…</p>
                </>
              ) : (
                <>
                  <Upload className="size-6 text-muted-foreground" />
                  <p className="text-sm font-bold text-foreground">Drag &amp; drop your PPTX file</p>
                  <p className="text-[13px] text-muted-foreground">or click to browse — Supported: .pptx only</p>
                </>
              )}
            </div>
          )}
          {uploadError && <p className="text-sm text-destructive font-medium">{uploadError}</p>}
        </div>
      )}

      {sourceType === "EXTERNAL_URL" && (
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-foreground mb-1">Paste PPT/PPTX URL</label>
          <input
            type="text"
            value={urlInput}
            onChange={(e) => handleExternalUrlInput(e.target.value)}
            placeholder="https://example.com/presentation.pptx"
            className={`w-full rounded-lg border bg-background px-3 py-2 text-base text-foreground outline-none font-mono transition ${
              validationError ? "border-rose-500 focus:border-rose-500" : "border-border focus:border-primary"
            }`}
          />
          {validationError ? (
            <p className="text-sm text-rose-500 font-medium">{validationError}</p>
          ) : (
            <p className="text-[13px] text-muted-foreground">Example: https://example.com/presentation.pptx</p>
          )}
        </div>
      )}

      {sourceType === "GOOGLE_DRIVE" && (
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-foreground mb-1">Paste Google Drive presentation link</label>
          <input
            type="text"
            value={urlInput}
            onChange={(e) => handleGoogleDriveInput(e.target.value)}
            placeholder="https://drive.google.com/file/d/FILE_ID/view"
            className={`w-full rounded-lg border bg-background px-3 py-2 text-base text-foreground outline-none font-mono transition ${
              validationError ? "border-rose-500 focus:border-rose-500" : "border-border focus:border-primary"
            }`}
          />
          {validationError ? (
            <p className="text-sm text-rose-500 font-medium">{validationError}</p>
          ) : (
            <p className="text-[13px] text-muted-foreground">Example: https://drive.google.com/file/d/FILE_ID/view</p>
          )}
        </div>
      )}
    </div>
  );
}

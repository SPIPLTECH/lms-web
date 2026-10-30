"use client";

import { useState, useRef } from "react";
import { uploadFileToVercelBlob } from "@/services/content.service";
import { useToast } from "@/components/ui/ToastProvider";

interface UploadButtonProps {
  onUploadSuccess: (url: string) => void;
  accept?: string;
  className?: string;
  disabled?: boolean;
}

export function UploadButton({
  onUploadSuccess,
  accept = "image/*,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,video/*",
  className = "",
  disabled = false,
}: UploadButtonProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      showToast(`Uploading ${file.name}...`, "info");

      const result = await uploadFileToVercelBlob(file);

      if (result && result.url) {
        onUploadSuccess(result.url);
        showToast("File uploaded successfully!", "success");
      } else {
        throw new Error("Invalid response from Blob upload route");
      }
    } catch (err: unknown) {
      console.error("Upload error:", err);
      const errMsg = err instanceof Error ? err.message : "Failed to upload file";
      showToast(errMsg, "error");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={accept}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading || disabled}
        className={`btn flex items-center justify-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold px-3 py-2 transition cursor-pointer disabled:opacity-50 shrink-0 ${className}`}
      >
        {isUploading ? (
          <>
            <span className="animate-spin text-sm">⏳</span>
            <span>Uploading...</span>
          </>
        ) : (
          <>
            <span>📁</span>
            <span>Choose File</span>
          </>
        )}
      </button>
    </>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, X, CheckCircle, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import MarkdownEditor from "@/components/ui/MarkdownEditor/MarkdownEditor";
import { escapeForContentApi, unescapeFromContentApi } from "@/lib/markdown";
import { htmlToMarkdown } from "@/lib/htmlToMarkdown";

const INITIAL_FORM = {
    title: "",
    type: "VIDEO",
    videoUrl: "",
    fileUrl: "",
    externalUrl: "",
    htmlContent: "",
};

// Types that require a file upload from device
const FILE_UPLOAD_TYPES = ["DOCUMENT", "PRESENTATION"];

// Allowed file extensions per type
const ACCEPTED_FILES = {
    DOCUMENT: ".pdf,.doc,.docx,.txt,.xls,.xlsx,.csv",
    PRESENTATION: ".ppt,.pptx,.odp",
};

export default function ContentForm({
    mode = "create",
    initialValues = null,
    loading = false,
    onSubmit,
}) {
    const [formData, setFormData] = useState(INITIAL_FORM);
    const [uploadState, setUploadState] = useState({
        uploading: false,
        error: null,
        fileName: null,
        fileSize: null,
    });

    const fileInputRef = useRef(null);

    useEffect(() => {
        if (initialValues) {
            setFormData({
                ...INITIAL_FORM,
                ...initialValues,
                htmlContent: htmlToMarkdown(unescapeFromContentApi(initialValues.htmlContent ?? "")),
            });
            // If editing and there is an existing fileUrl, show the filename
            if (initialValues.fileUrl) {
                const parts = initialValues.fileUrl.split("/");
                setUploadState((prev) => ({
                    ...prev,
                    fileName: decodeURIComponent(parts[parts.length - 1]),
                }));
            }
        }
    }, [initialValues]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));

        // Reset file state when type changes
        if (name === "type") {
            setFormData((prev) => ({
                ...prev,
                type: value,
                fileUrl: "",
            }));
            setUploadState({ uploading: false, error: null, fileName: null, fileSize: null });
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadState({ uploading: true, error: null, fileName: file.name, fileSize: file.size });

        try {
            const { uploadContentFile } = await import("@/services/content.service");
            const data = await uploadContentFile(file);

            if (!data || !data.fileUrl) {
                throw new Error("Upload failed. No file URL returned.");
            }

            setFormData((prev) => ({
                ...prev,
                fileUrl: data.fileUrl,
                ...(prev.type === "VIDEO" ? { videoUrl: data.fileUrl } : {}),
            }));
            setUploadState({
                uploading: false,
                error: null,
                fileName: data.originalName || file.name,
                fileSize: data.size || file.size,
            });
        } catch (err) {
            setUploadState({
                uploading: false,
                error: err.message || "Upload failed. Please try again.",
                fileName: null,
                fileSize: null,
            });
            setFormData((prev) => ({ ...prev, fileUrl: "" }));
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleRemoveFile = () => {
        setFormData((prev) => ({ ...prev, fileUrl: "" }));
        setUploadState({ uploading: false, error: null, fileName: null, fileSize: null });
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validate file uploaded for file-based types
        if (FILE_UPLOAD_TYPES.includes(formData.type) && !formData.fileUrl) {
            setUploadState((prev) => ({
                ...prev,
                error: "Please choose a file from your device before submitting.",
            }));
            return;
        }

        onSubmit?.({
            ...formData,
            ...(formData.type === "TEXT" && { htmlContent: escapeForContentApi(formData.htmlContent) }),
        });
    };

    const formatBytes = (bytes) => {
        if (!bytes) return "";
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const isFileType = FILE_UPLOAD_TYPES.includes(formData.type);

    return (
        <Card className="mx-auto max-w-4xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">
                    {mode === "create" ? "Create Content" : "Edit Content"}
                </h1>
                <p className="mt-2 text-muted-foreground">
                    Add learning material to this lesson.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title */}
                <Input
                    label="Content Title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g. Java Collections Video"
                    required
                />

                {/* Type Selector */}
                <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                        Content Type
                    </label>
                    <select
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-transparent bg-background px-4 py-3 text-foreground focus:border-primary outline-none"
                    >
                        <option value="VIDEO">Video</option>
                        <option value="DOCUMENT">Document / PDF / File</option>
                        <option value="PRESENTATION">Presentation (PPT)</option>
                        <option value="LINK">External Link</option>
                        <option value="TEXT">Text / HTML Content</option>
                    </select>
                </div>

                {/* Video URL or File Upload */}
                {formData.type === "VIDEO" && (
                    <div className="space-y-4">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-foreground">
                                Upload Video File (Direct Player — Zero YouTube Chrome)
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
                                disabled={uploadState.uploading}
                                className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/10 hover:bg-primary/20 px-3.5 py-3 text-sm font-bold text-primary transition cursor-pointer disabled:opacity-50"
                            >
                                {uploadState.uploading ? (
                                    <>
                                        <Loader2 className="size-4 animate-spin text-primary" />
                                        <span>Uploading Video File…</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="size-4" />
                                        <span>Choose Video File (.mp4, .webm, .mov)</span>
                                    </>
                                )}
                            </button>
                            <p className="mt-1.5 text-xs text-muted-foreground">
                                Plays in Orange Tree&apos;s own video player with zero YouTube chrome.
                            </p>
                        </div>

                        <div className="relative flex items-center justify-center my-1">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-border/60" />
                            </div>
                            <span className="relative bg-card px-2 text-[11px] font-bold text-muted-foreground uppercase">
                                OR
                            </span>
                        </div>

                        <Input
                            label="Video URL (YouTube or Direct File Link)"
                            name="videoUrl"
                            value={formData.videoUrl}
                            onChange={handleChange}
                            placeholder="https://youtu.be/… or direct .mp4 link"
                            required={!formData.fileUrl}
                        />
                    </div>
                )}

                {/* File Picker (DOCUMENT / PRESENTATION) */}
                {isFileType && (
                    <div>
                        <label className="mb-2 block text-sm font-medium text-foreground">
                            {formData.type === "PRESENTATION"
                                ? "Presentation File (.ppt, .pptx)"
                                : "Document File (.pdf, .docx, .xls, .txt, …)"}
                        </label>

                        {/* Dropzone / File Picker */}
                        {!formData.fileUrl && !uploadState.uploading && (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-transparent bg-background/50 px-6 py-10 text-center cursor-pointer hover:border-primary/60 hover:bg-background transition-all duration-200"
                            >
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                                    <Upload size={22} className="text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-foreground">
                                        Click to choose a file from your device
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Accepted:{" "}
                                        {formData.type === "PRESENTATION"
                                            ? ".ppt, .pptx, .odp"
                                            : ".pdf, .doc, .docx, .xls, .xlsx, .txt, .csv"}
                                        {" "}· Max 50 MB
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Hidden file input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept={ACCEPTED_FILES[formData.type]}
                            onChange={handleFileChange}
                            className="hidden"
                        />

                        {/* Uploading State */}
                        {uploadState.uploading && (
                            <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3.5">
                                <Loader2 size={18} className="text-primary animate-spin shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-foreground truncate">
                                        {uploadState.fileName}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Uploading…</p>
                                </div>
                            </div>
                        )}

                        {/* Uploaded Successfully */}
                        {formData.fileUrl && !uploadState.uploading && (
                            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3.5">
                                <CheckCircle size={18} className="text-emerald-400 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-foreground truncate">
                                        {uploadState.fileName || "File uploaded"}
                                    </p>
                                    {uploadState.fileSize && (
                                        <p className="text-xs text-muted-foreground">
                                            {formatBytes(uploadState.fileSize)} · Uploaded successfully
                                        </p>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={handleRemoveFile}
                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition shrink-0"
                                    title="Remove file"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        )}

                        {/* Upload Error */}
                        {uploadState.error && (
                            <p className="mt-2 text-sm text-red-400 flex items-center gap-1.5">
                                <X size={13} className="shrink-0" />
                                {uploadState.error}
                            </p>
                        )}
                    </div>
                )}

                {/* External Link */}
                {formData.type === "LINK" && (
                    <Input
                        label="External URL"
                        name="externalUrl"
                        value={formData.externalUrl}
                        onChange={handleChange}
                        placeholder="https://..."
                        required
                    />
                )}

                {/* Text / Markdown Content */}
                {formData.type === "TEXT" && (
                    <div>
                        <label className="mb-2 block text-sm font-medium text-foreground">
                            Text Content (Markdown)
                        </label>
                        <MarkdownEditor
                            value={formData.htmlContent}
                            onChange={(value) => setFormData(prev => ({ ...prev, htmlContent: value }))}
                            placeholder="Enter content in Markdown..."
                        />
                    </div>
                )}

                {/* Submit */}
                <div className="flex justify-end">
                    <Button type="submit" disabled={loading || uploadState.uploading}>
                        {loading
                            ? mode === "create"
                                ? "Creating…"
                                : "Updating…"
                            : mode === "create"
                                ? "Create Content"
                                : "Update Content"}
                    </Button>
                </div>
            </form>
        </Card>
    );
}
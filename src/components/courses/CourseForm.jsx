"use client";

import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import { Image as ImageIcon, UploadCloud } from "lucide-react";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { getDisplayUrl } from "@/lib/blob";
import { uploadFileToBlob } from "@/services/blobUpload.service";

const INITIAL_FORM = {
    title: "",
    description: "",
    category: "",
    level: "Beginner",
    thumbnailUrl: "",
    visibility: "PUBLIC",
    language: "English",
    tags: "",
    certificatesEnabled: false,
    discussionEnabled: true,
    sequentialLearning: true,
    estimatedLearningHours: 0,
};

const LEVELS = [
    "Beginner",
    "Intermediate",
    "Advanced",
];

export default function CourseForm({
                                       mode = "create",
                                       initialValues = null,
                                       loading = false,
                                       onSubmit,
                                       onCancel,
                                       submitError = "",
                                   }) {
    const router = useRouter();

    const [formData, setFormData] =
        useState(INITIAL_FORM);

    const [validationErrors, setValidationErrors] =
        useState({});

    const [imageError, setImageError] = useState(false);
    const [uploading, setUploading] = useState(false);

    const handleFileUpload = async (file) => {
        if (!file) return;
        setUploading(true);
        try {
            const result = await uploadFileToBlob(file);
            setFormData((prev) => ({ ...prev, thumbnailUrl: result.url || result.fileUrl }));
            setImageError(false);
        } catch (error) {
            console.error("Thumbnail upload failed:", error);
        } finally {
            setUploading(false);
        }
    };

    useEffect(() => {
        setImageError(false);
    }, [formData.thumbnailUrl]);

    useEffect(() => {
        if (initialValues) {
            setFormData({
                title:
                    initialValues.title ?? "",
                description:
                    initialValues.description ??
                    "",
                category:
                    initialValues.category ??
                    "",
                level:
                    initialValues.level ??
                    "Beginner",
                thumbnailUrl:
                    initialValues.thumbnailUrl ??
                    "",
                visibility: initialValues.visibility ?? "PUBLIC",
                language: initialValues.language ?? "English",
                tags: Array.isArray(initialValues.tags) ? initialValues.tags.join(", ") : (initialValues.tags ?? ""),
                certificatesEnabled: initialValues.certificatesEnabled ?? false,
                discussionEnabled: initialValues.discussionEnabled ?? true,
                sequentialLearning: initialValues.sequentialLearning ?? true,
                estimatedLearningHours: initialValues.estimatedLearningHours ?? 0,
            });
        }
    }, [initialValues]);

    const handleChange = (e) => {
        const {name, value, type, checked} =
            e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const errors = {};
        if (formData.title.trim().length < 3) {
            errors.title = "Title must be at least 3 characters long.";
        }
        if (formData.description.trim().length < 20) {
            errors.description = "Description must be at least 20 characters long.";
        }
        if (!formData.category.trim()) {
            errors.category = "Category is required.";
        }

        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
        }

        setValidationErrors({});
        
        const payload = {
            ...formData,
            tags: formData.tags ? formData.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
            estimatedLearningHours: formData.estimatedLearningHours ? Number(formData.estimatedLearningHours) : 0,
        };
        
        onSubmit?.(payload);
    };

    // Callers pass the page to return to; falling back to history keeps the
    // button useful anywhere the form is dropped in without one.
    const handleCancel = () => {
        if (onCancel) {
            onCancel();
            return;
        }
        router.back();
    };

    return (
        <Card className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">
                    {mode === "create"
                        ? "Create Course"
                        : "Edit Course"}
                </h1>

                <p className="text-muted-foreground mt-2">
                    {mode === "create"
                        ? "Create a new course for your student."
                        : "Update your course information."}
                </p>
            </div>

            <form
                onSubmit={handleSubmit}
                className="space-y-6"
                noValidate
            >
                {submitError && (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-400">
                        {submitError}
                    </div>
                )}

                <Input
                    label="Course Title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Java SE"
                    error={validationErrors.title}
                    required
                />

                <div>
                    <label className="block mb-2 text-sm font-medium">
                        Description
                    </label>

                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={6}
                        required
                        className="
              w-full
              rounded-lg
              bg-background
              border
              border-transparent
              px-4
              py-3
              outline-none
              focus:border-primary
              resize-none
            "
                        placeholder="Enter course description..."
                    />
                    {validationErrors.description && (
                        <p className="mt-2 text-sm text-red-500">
                            {validationErrors.description}
                        </p>
                    )}
                </div>

                <Input
                    label="Category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    placeholder="Programming"
                    error={validationErrors.category}
                    required
                />

                <div>
                    <label className="block mb-2 text-sm font-medium">
                        Level
                    </label>

                    <select
                        name="level"
                        value={formData.level}
                        onChange={handleChange}
                        className="
              w-full
              rounded-lg
              bg-background
              border
              border-transparent
              px-4
              py-3
              outline-none
              focus:border-primary
            "
                    >
                        {LEVELS.map((level) => (
                            <option
                                key={level}
                                value={level}
                            >
                                {level}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block mb-2 text-sm font-medium text-foreground">
                        Thumbnail URL (optional)
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                        <div className="flex-1">
                            <Input
                                name="thumbnailUrl"
                                value={formData.thumbnailUrl}
                                onChange={handleChange}
                                placeholder="Paste image URL or click Upload Image..."
                            />
                        </div>
                        <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-foreground bg-muted hover:bg-muted/80 border border-border rounded-xl cursor-pointer transition shrink-0 h-[46px]">
                            <UploadCloud size={16} />
                            {uploading ? "Uploading..." : "Upload Image"}
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploading}
                                onChange={(e) => handleFileUpload(e.target.files?.[0])}
                            />
                        </label>
                    </div>
                </div>

                {formData.thumbnailUrl && (
                    <div className="mt-3">
                        <label className="block mb-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            Thumbnail Preview
                        </label>

                        <div className="w-full max-w-sm aspect-video bg-background rounded-xl overflow-hidden border border-border shadow-md flex items-center justify-center">
                            {imageError ? (
                                <div className="p-4 flex flex-col items-center justify-center text-center space-y-1 bg-muted/20">
                                    <ImageIcon className="w-6 h-6 text-muted-foreground/60 mb-1" />
                                    <span className="text-xs text-muted-foreground font-medium max-w-xs">
                                        {formData.thumbnailUrl.includes("chatgpt.com")
                                            ? "ChatGPT attachment URLs are private session links. Please download the image to your computer and use the 'Upload Image' button."
                                            : "Unable to preview image. Please verify the link or use 'Upload Image' to select a file from your device."}
                                    </span>
                                </div>
                            ) : (
                                <img
                                    src={getDisplayUrl(formData.thumbnailUrl, { width: 640 })}
                                    alt="Thumbnail Preview"
                                    onError={() => setImageError(true)}
                                    className="h-full w-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
                                />
                            )}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block mb-2 text-sm font-medium">Visibility</label>
                        <select
                            name="visibility"
                            value={formData.visibility}
                            onChange={handleChange}
                            className="w-full rounded-lg bg-background border border-transparent px-4 py-3 outline-none focus:border-primary"
                        >
                            <option value="PUBLIC">Public</option>
                            <option value="PRIVATE">Private</option>
                            <option value="UNLISTED">Unlisted</option>
                        </select>
                    </div>

                    <Input
                        label="Language"
                        name="language"
                        value={formData.language}
                        onChange={handleChange}
                        placeholder="e.g. English, Spanish"
                    />

                    <Input
                        label="Tags (comma separated)"
                        name="tags"
                        value={formData.tags}
                        onChange={handleChange}
                        placeholder="e.g. React, Web, Frontend"
                    />

                    <Input
                        label="Estimated Learning Hours"
                        name="estimatedLearningHours"
                        type="number"
                        min="0"
                        step="0.5"
                        value={formData.estimatedLearningHours}
                        onChange={handleChange}
                    />
                </div>

                <div className="space-y-4 rounded-xl border border-border bg-background/30 p-5 mt-4">
                    <h3 className="text-sm font-bold text-foreground">Course Features</h3>
                    
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            name="certificatesEnabled"
                            checked={formData.certificatesEnabled}
                            onChange={handleChange}
                            className="w-4 h-4 rounded border-transparent bg-background text-primary focus:ring-orange-500/20"
                        />
                        <span className="text-sm text-foreground">Enable Certificates</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            name="discussionEnabled"
                            checked={formData.discussionEnabled}
                            onChange={handleChange}
                            className="w-4 h-4 rounded border-transparent bg-background text-primary focus:ring-orange-500/20"
                        />
                        <span className="text-sm text-foreground">Enable Course Discussions</span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            name="sequentialLearning"
                            checked={formData.sequentialLearning}
                            onChange={handleChange}
                            className="mt-0.5 w-4 h-4 rounded border-transparent bg-background text-primary focus:ring-orange-500/20"
                        />
                        <span className="text-sm text-foreground">
                            Sequential learning
                            <span className="block text-xs text-muted-foreground">
                                Students must finish each item before the next one opens, and their progress is tracked. Turn off to let them open any lesson, quiz or assignment in any order; progress is then not tracked.
                            </span>
                        </span>
                    </label>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={handleCancel}
                        disabled={loading}
                    >
                        Cancel
                    </Button>

                    <Button
                        type="submit"
                        disabled={loading}
                    >
                        {loading
                            ? mode === "create"
                                ? "Creating..."
                                : "Updating..."
                            : mode === "create"
                                ? "Create Course"
                                : "Update Course"}
                    </Button>
                </div>
            </form>
        </Card>
    );
}
"use client";

import { useEffect, useState } from "react";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import MarkdownEditor from "@/components/ui/MarkdownEditor/MarkdownEditor";
import { htmlToMarkdown } from "@/lib/htmlToMarkdown";
import { canPublishEntity } from "@/lib/publishGate";

const INITIAL_FORM = {
    title: "",
    description: "",
    isPublished: false,
};

// Also the SubTopic and Concept form: all three share the same
// title/description/isPublished shape, so the level is only a label.
export default function TopicForm({
                                       mode = "create",
                                       initialValues = null,
                                       loading = false,
                                       contentsCount = 0,
                                       onSubmit,
                                       compact = false,
                                       entityLabel = "Topic",
                                       parentLabel = "lesson",
                                   }) {
    const lowerLabel = entityLabel.toLowerCase();
    const [formData, setFormData] =
        useState(INITIAL_FORM);

    const canPublish = canPublishEntity(contentsCount, initialValues);

    useEffect(() => {
        if (initialValues) {
            setFormData({
                title:
                    initialValues.title ?? "",
                description:
                    htmlToMarkdown(initialValues.description ?? ""),
                isPublished:
                    initialValues.isPublished ??
                    false,
            });
        }
    }, [initialValues]);

    const handleChange = (e) => {
        const { name, value, type, checked } =
            e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        onSubmit?.(formData);
    };

    const formBody = (
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col justify-between">
            <div className="flex-1 min-h-0 overflow-y-auto space-y-5 pr-1 pb-2">
                <Input
                    label={`${entityLabel} Title`}
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Variables and Data Types"
                    required
                />

                <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                        Description
                    </label>

                    <MarkdownEditor
                        value={formData.description}
                        onChange={(value) => setFormData((prev) => ({ ...prev, description: value }))}
                        placeholder={`Enter ${lowerLabel} description in Markdown...`}
                    />
                </div>

                <div className="flex flex-col gap-2 bg-background/40 p-4 rounded-xl border border-border">
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="isPublished"
                            name="isPublished"
                            checked={formData.isPublished}
                            onChange={handleChange}
                            disabled={!canPublish}
                            className="h-4 w-4 rounded border-transparent bg-background text-primary focus:ring-orange-500 focus:ring-offset-slate-900 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <label
                            htmlFor="isPublished"
                            className={`text-sm font-semibold cursor-pointer ${canPublish ? "text-foreground" : "text-muted-foreground cursor-not-allowed"}`}
                        >
                            Publish {entityLabel} (Make this {lowerLabel} visible to students instantly)
                        </label>
                    </div>
                    {!canPublish && (
                        <p className="text-xs text-amber-400/90 pl-7">
                            Add at least one content item, quiz or assignment before you can publish this {lowerLabel}.
                        </p>
                    )}
                </div>
            </div>

            <div className="pt-4 shrink-0 border-t border-border flex justify-end">
                <Button
                    type="submit"
                    disabled={loading}
                >
                    {loading
                        ? mode === "create"
                            ? "Creating..."
                            : "Updating..."
                        : mode === "create"
                            ? `Create ${entityLabel}`
                            : `Update ${entityLabel}`}
                </Button>
            </div>
        </form>
    );

    if (compact) {
        return formBody;
    }

    return (
        <Card className="mx-auto max-w-4xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground">
                    {mode === "create"
                        ? `Create ${entityLabel}`
                        : `Edit ${entityLabel}`}
                </h1>

                <p className="mt-2 text-muted-foreground">
                    {mode === "create"
                        ? `Add a new ${lowerLabel} to this ${parentLabel}.`
                        : `Update ${lowerLabel} details.`}
                </p>
            </div>

            {formBody}
        </Card>
    );
}

"use client";

import {useEffect, useState} from "react";

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

export default function ModuleForm({
                                       mode = "create",
                                       initialValues = null,
                                       loading = false,
                                       lessonsCount = 0,
                                       onSubmit,
                                       compact = false,
                                   }) {
    const [formData, setFormData] =
        useState(INITIAL_FORM);

    const canPublish = canPublishEntity(lessonsCount, initialValues);

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
        const {name, value, type, checked} =
            e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // New items are published automatically. A draft is invisible to
        // students along with everything inside it, and new items used to be
        // saved as drafts by default — content added to them never reached
        // students. Students still see nothing until the course itself is
        // published; an item can be set back to draft from its edit form.
        if (mode === "create") {
            onSubmit?.({ ...formData, isPublished: true });
            return;
        }

        onSubmit?.(formData);
    };

    const formBody = (
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col justify-between">
            <div className="flex-1 min-h-0 overflow-y-auto space-y-5 pr-1 pb-2">
                <Input
                    label="Module Title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Introduction to Java"
                    required
                />

                <div>
                    <label className="mb-2 block text-label text-foreground">
                        Description
                    </label>

                    <MarkdownEditor
                        value={formData.description}
                        onChange={(value) => setFormData((prev) => ({ ...prev, description: value }))}
                        placeholder="Enter module description in Markdown..."
                    />
                </div>

                <div className="flex flex-col gap-2 bg-background/40 p-4 rounded-xl border border-border">
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="isPublished"
                            name="isPublished"
                            checked={mode === "create" || formData.isPublished}
                            onChange={handleChange}
                            disabled={mode === "create" || !canPublish}
                            className="h-4 w-4 rounded border-transparent bg-background text-primary focus:ring-orange-500 focus:ring-offset-slate-900 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <label
                            htmlFor="isPublished"
                            className={`text-sm font-semibold cursor-pointer ${canPublish ? "text-foreground" : "text-muted-foreground cursor-not-allowed"}`}
                        >
                            Publish Module (Make this module visible to students instantly)
                        </label>
                    </div>
                    {(mode === "create" || !canPublish) && (
                        <p className="text-xs text-amber-400/90 pl-7">
                            {mode === "create"
                                ? "Published automatically: visible to students as soon as the course is published."
                                : `Add at least one lesson, content item, quiz or assignment before you can publish this module.`}
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
                            ? "Create Module"
                            : "Update Module"}
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
                <h1 className="text-3xl font-bold">
                    {mode === "create"
                         ? "Create Module"
                         : "Edit Module"}
                </h1>

                <p className="mt-2 text-muted-foreground">
                    {mode === "create"
                        ? "Organize your course by adding a new module."
                        : "Update the module information."}
                </p>
            </div>

            {formBody}
        </Card>
    );
}
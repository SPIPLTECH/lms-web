"use client";

import {useState} from "react";
import Image from "next/image";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { getDisplayUrl } from "@/lib/blob";


const getInitialFormData = (values = {}) => ({
    title: values.title || "",
    description: values.description || "",
    category: values.category || "",
    level: values.level || "Beginner",
    thumbnailUrl: values.thumbnailUrl || "",
    status: values.status || "DRAFT",
});

export default function CourseForm({
                                       initialValues = {},
                                       onSubmit,
                                       isSubmitting = false,
                                   }) {
    const [formData, setFormData] =
        useState(() =>
            getInitialFormData(
                initialValues
            )
        );

    const handleChange = (e) => {
        const {name, value} =
            e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        onSubmit?.(formData);
    };

    return (
        <Card tone="flat">
            <form
                onSubmit={handleSubmit}
                className="space-y-6"
            >
                <Input
                    label="Course Title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                />

                <div>
                    <label className="mb-2 block text-sm font-medium text-muted-foreground">
                        Description
                    </label>

                    <textarea
                        name="description"
                        rows={6}
                        value={
                            formData.description
                        }
                        onChange={
                            handleChange
                        }
                        className="
              w-full
              rounded-lg
              border
              border-border
              bg-background
              px-4
              py-3
              text-foreground
              outline-none
              focus:border-primary
            "
                        required
                    />
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <Input
                        label="Category"
                        name="category"
                        value={
                            formData.category
                        }
                        onChange={
                            handleChange
                        }
                        required
                    />

                    <div>
                        <label className="mb-2 block text-sm font-medium text-muted-foreground">
                            Level
                        </label>

                        <select
                            name="level"
                            value={
                                formData.level
                            }
                            onChange={
                                handleChange
                            }
                            className="
                w-full
                rounded-lg
                border
                border-border
                bg-background
                px-4
                py-3
                text-foreground
                outline-none
                focus:border-primary
              "
                        >
                            <option value="Beginner">
                                Beginner
                            </option>

                            <option value="Intermediate">
                                Intermediate
                            </option>

                            <option value="Advanced">
                                Advanced
                            </option>
                        </select>
                    </div>
                </div>

                <Input
                    label="Thumbnail URL"
                    name="thumbnailUrl"
                    value={
                        formData.thumbnailUrl
                    }
                    onChange={
                        handleChange
                    }
                    required
                />

                {formData.thumbnailUrl && (
                    <div className="relative w-full aspect-video overflow-hidden rounded-xl border border-white/10">
                        <Image
                            src={getDisplayUrl(formData.thumbnailUrl)}
                            alt={formData.title}
                            fill
                            // Stored files come through /api/blob-proxy?url=…; Next
                            // refuses to optimize a local URL with a query string
                            // and throws, taking the whole edit page down.
                            unoptimized
                            className="object-cover"
                        />
                    </div>
                )}

                <div>
                    <label className="mb-2 block text-sm font-medium text-muted-foreground">
                        Status
                    </label>

                    <select
                        name="status"
                        value={
                            formData.status
                        }
                        onChange={
                            handleChange
                        }
                        className="
              w-full
              rounded-lg
              border
              border-border
              bg-background
              px-4
              py-3
              text-foreground
              outline-none
              focus:border-primary
            "
                    >
                        <option value="DRAFT">
                            Draft
                        </option>

                        <option value="PUBLISHED">
                            Published
                        </option>
                    </select>
                </div>

                <div className="flex justify-end">
                    <Button
                        type="submit"
                        disabled={
                            isSubmitting
                        }
                    >
                        {isSubmitting
                            ? "Saving..."
                            : "Save Course"}
                    </Button>
                </div>
            </form>
        </Card>
    );
}
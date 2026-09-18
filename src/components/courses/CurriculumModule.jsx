"use client";

import {useState} from "react";
import ActionMenu from "@/components/menus/ActionMenu";
import {
    FaChevronDown,
    FaChevronRight,
    FaBook,
    FaPlayCircle,
    FaFileAlt,
    FaLink,
} from "@/components/ui/reactIcons";

import Card from "@/components/ui/Card";
import { getTopicTreeContents } from "@/lib/courseMapper";
import Button from "@/components/ui/Button";

const getContentIcon = (type) => {
    switch (type) {
        case "VIDEO":
            return (
                <FaPlayCircle className="text-red-400"/>
            );

        case "DOCUMENT":
        case "TEXT":
        case "PRESENTATION":
            return (
                <FaFileAlt className="text-blue-400"/>
            );

        case "LINK":
            return (
                <FaLink className="text-green-400"/>
            );

        default:
            return (
                <FaBook className="text-primary"/>
            );
    }
};

export default function CurriculumModule({
                                             module,
                                             index,
                                             onEdit,
                                             onDelete,
                                             onAddLesson,
                                             onAddContent,
                                             onEditLesson,
                                             onDeleteLesson,
                                             onEditContent,
                                             onDeleteContent,
                                         }) {
    const [open, setOpen] =
        useState(true);

    return (
        <Card
            className="
    border
    border-border
    hover:border-primary/30
    transition-all
    duration-300
  "
        >

            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <button
                    onClick={() =>
                        setOpen(!open)
                    }
                    className="
            flex
            items-center
            gap-3
            text-left
          "
                >

                    {open ? (
                        <FaChevronDown/>
                    ) : (
                        <FaChevronRight/>
                    )}

                    <div>

                        <div className="flex items-center gap-3">

                            <div className="
      flex
      h-12
      w-12
      items-center
      justify-center
      rounded-xl
      bg-primary/10
    ">

                                <FaBook className="text-primary text-lg"/>

                            </div>

                            <div>
                                <div className="flex items-center gap-3">
  <span
      className="
      rounded-full
      bg-primary/10
      px-3
      py-1
      text-xs
      font-bold
      uppercase
      tracking-wider
      text-primary
    "
  >
    Module {index + 1}
  </span>
                                </div>

                                <h2 className="mt-1 text-lg sm:text-xl font-semibold tracking-tight">

                                    {module.title}

                                </h2>

                            </div>

                        </div>

                        {module.description && (

                            <p className="mt-4 text-muted-foreground leading-7">

                                {module.description}

                            </p>

                        )}

                    </div>

                </button>

                <div className="flex items-center gap-3">

                    <div className="rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">

                        {module.lessons?.length || 0} Lessons

                    </div>

                    {(() => {
                        const items = [
                            onAddLesson && { label: "Add Lesson", onClick: () => onAddLesson(module.id) },
                            onEdit && { label: "Edit Module", onClick: () => onEdit(module) },
                            onDelete && { label: "Delete Module", onClick: () => onDelete(module.id) },
                        ].filter(Boolean);
                        return items.length > 0 ? <ActionMenu items={items} /> : null;
                    })()}

                </div>
            </div>

            {open && (

                <div className="relative mt-8 ml-5 border-l border-border pl-8 space-y-6">

                    {module.lessons?.length ? (

                        module.lessons.map(
                            (
                                lesson,
                                lessonIndex
                            ) => (

                                <div
                                    key={lesson.id}
                                    className="
    relative
    rounded-2xl
    border
    border-transparent
    bg-background/40
    p-7
    transition-all
    duration-300
    hover:border-primary/30
  "
                                >

                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                                        <div>

                                            <div className="flex items-center gap-3">

                                                <div className="
      flex
      h-10
      w-10
      items-center
      justify-center
      rounded-xl
      bg-blue-500/10
    ">

                                                    <FaBook className="text-blue-400"/>

                                                </div>

                                                <div>

                                                    <p className="text-xs uppercase tracking-widest text-blue-400">
                                                        Lesson {lessonIndex + 1}
                                                    </p>

                                                    <h3 className="text-lg font-semibold">
                                                        {lesson.title}
                                                    </h3>

                                                </div>

                                            </div>

                                            {lesson.description && (

                                                <p className="mt-4 text-muted-foreground leading-7">

                                                    {lesson.description}

                                                </p>

                                            )}

                                        </div>
                                        <div className="flex items-center gap-3">

                                            <div
                                                className="rounded-full bg-blue-500/10 px-3 py-1 text-sm text-blue-400">

                                                {(lesson.topics || []).reduce((sum, topic) => sum + getTopicTreeContents(topic).length, 0)} Contents

                                            </div>

                                            {(() => {
                                                const items = [
                                                    onAddContent && { label: "Add Content", onClick: () => onAddContent(lesson.id) },
                                                    onEditLesson && { label: "Edit Lesson", onClick: () => onEditLesson(lesson) },
                                                    onDeleteLesson && { label: "Delete Lesson", onClick: () => onDeleteLesson(lesson.id) },
                                                ].filter(Boolean);
                                                return items.length > 0 ? <ActionMenu items={items} /> : null;
                                            })()}

                                        </div>

                                    </div>

                                    <div className="mt-6 rounded-xl bg-background/40 p-4 space-y-3">
                                        {(() => {
                                            const lessonContents = (lesson.topics || []).flatMap((topic) => getTopicTreeContents(topic));
                                            return lessonContents.length ? (

                                            lessonContents.map(
                                                (content) => (
                                                    <div
                                                        key={content.id}
                                                        className="
    flex
    items-center
    justify-between
    rounded-xl
    border
    border-border
    bg-background/70
    p-4
    transition-all
    duration-300
    hover:border-primary/30
    hover:bg-background
  "
                                                    >

                                                        <div className="flex items-center gap-4">

                                                            {getContentIcon(
                                                                content.type
                                                            )}
                                                            <div>

                                                                <h4 className="font-semibold text-foreground">

                                                                    {content.title}

                                                                </h4>

                                                                <span
                                                                    className="
      mt-2
      inline-flex
      rounded-full
      bg-muted
      px-3
      py-1
      text-xs
      font-medium
      text-foreground
    "
                                                                >
    {content.type}
  </span>

                                                            </div>

                                                        </div>

                                                        <div className="flex items-center gap-3">
                                                            {(() => {
                                                                const items = [
                                                                    onEditContent && { label: "Edit Content", onClick: () => onEditContent(content) },
                                                                    onDeleteContent && { label: "Delete Content", onClick: () => onDeleteContent(content.id) },
                                                                ].filter(Boolean);
                                                                return items.length > 0 ? <ActionMenu items={items} /> : null;
                                                            })()}

                                                        </div>

                                                    </div>

                                                )
                                            )

                                        ) : (

                                            <div
                                                className="
    rounded-xl
    border
    border-dashed
    border-transparent
    bg-background/40
    py-10
    text-center
  "
                                            >

                                                <div
                                                    className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">

                                                    <FaFileAlt className="text-muted-foreground"/>

                                                </div>

                                                <h4 className="font-semibold">
                                                    No Content Yet
                                                </h4>

                                                <p className="mt-2 text-sm text-muted-foreground">
                                                    Add your first learning material.
                                                </p>

                                            </div>

                                        );
                                        })()}

                                    </div>

                                </div>

                            )
                        )

                    ) : (

                        <div className="rounded-xl border border-dashed border-transparent py-10 text-center">

                            <h3 className="text-lg font-semibold">
                                No Lessons Found
                            </h3>

                            <p className="mt-2 text-muted-foreground">
                                Start by adding your first lesson.
                            </p>

                            <Button
                                className="mt-5"
                            >
                                + Add Lesson
                            </Button>

                        </div>

                    )}

                </div>

            )}

        </Card>

    );
}
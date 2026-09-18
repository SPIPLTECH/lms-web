"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Layers } from "lucide-react";

import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import LessonList from "./LessonList";
import { getTopicTreeContents } from "@/lib/courseMapper";

function formatDuration(totalMinutes) {
    if (!totalMinutes || totalMinutes <= 0) return null;

    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;

    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
}

function getModuleDuration(module) {
    return (module.lessons || []).reduce(
        (sum, lesson) =>
            sum +
            (lesson.topics || []).reduce(
                (topicSum, topic) =>
                    topicSum +
                    getTopicTreeContents(topic).reduce(
                        (contentSum, content) => contentSum + (content.duration || 0),
                        0
                    ),
                0
            ),
        0
    );
}

export default function ModuleAccordion({
                                            modules = [],
                                        }) {
    const [expandedModuleId, setExpandedModuleId] = useState(
        modules.length ? modules[0].id : null
    );

    if (!modules.length) {
        return (
            <EmptyState
                icon={Layers}
                title="No Modules Available"
                description="This course does not contain any modules yet."
            />
        );
    }

    const toggleModule = (moduleId) => {
        setExpandedModuleId((previous) =>
            previous === moduleId ? null : moduleId
        );
    };

    return (
        <div className="space-y-3">
            <div className="px-1">
                <h2 className="text-lg font-semibold text-foreground">
                    Course Content{" "}
                    <span className="text-sm font-normal text-primary">
                        (Preview)
                    </span>
                </h2>

                <p className="mt-0.5 text-xs text-muted-foreground">
                    {modules.length} Module{modules.length !== 1 ? "s" : ""}
                </p>
            </div>

            <Card padding="p-0" className="divide-y divide-slate-800">
                {modules.map((module, index) => {
                    const expanded = expandedModuleId === module.id;
                    const lessonCount = module.lessons?.length || 0;
                    const durationLabel = formatDuration(getModuleDuration(module));

                    return (
                        <div key={module.id}>
                            <button
                                type="button"
                                onClick={() => toggleModule(module.id)}
                                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-muted/40"
                            >
                                <div className="min-w-0">
                                    <h3 className="truncate text-sm font-semibold text-foreground">
                                        Module {index + 1}: {module.title}
                                    </h3>

                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        {lessonCount} Lesson{lessonCount !== 1 ? "s" : ""}
                                        {durationLabel ? ` • ${durationLabel}` : ""}
                                    </p>
                                </div>

                                {expanded ? (
                                    <ChevronDown className="h-4 w-4 shrink-0 text-primary" />
                                ) : (
                                    <ChevronRight className="h-4 w-4 shrink-0 text-primary" />
                                )}
                            </button>

                            {expanded && (
                                <div className="border-t border-border">
                                    <LessonList lessons={module.lessons} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </Card>
        </div>
    );
}

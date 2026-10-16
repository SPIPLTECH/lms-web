import {
    Video,
    FileText,
    Presentation,
    Image as ImageIcon,
    Link as LinkIcon,
} from "lucide-react";
import { getTopicTreeContents } from "@/lib/courseMapper";

function formatDuration(totalMinutes) {
    if (!totalMinutes || totalMinutes <= 0) return null;

    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;

    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
}

const TYPE_META = {
    VIDEO: { icon: Video, label: "Video" },
    PRESENTATION: { icon: Presentation, label: "Presentation" },
    PDF: { icon: FileText, label: "Document" },
    DOCUMENT: { icon: FileText, label: "Document" },
    FILE: { icon: FileText, label: "Document" },
    HTML: { icon: FileText, label: "Article" },
    TEXT: { icon: FileText, label: "Article" },
    LINK: { icon: LinkIcon, label: "Link" },
    EXTERNAL_LINK: { icon: LinkIcon, label: "Link" },
    IMAGE: { icon: ImageIcon, label: "Image" },
};

// Priority order when a lesson mixes content types — the first match wins as
// the row's headline icon/label (e.g. a lesson with both a video and a PDF
// reads as "Video").
const TYPE_PRIORITY = [
    "VIDEO",
    "PRESENTATION",
    "PDF",
    "DOCUMENT",
    "FILE",
    "HTML",
    "TEXT",
    "LINK",
    "EXTERNAL_LINK",
    "IMAGE",
];

function getLessonMeta(lesson) {
    const contents = (lesson.topics || []).flatMap((topic) => getTopicTreeContents(topic));

    const totalDuration = contents.reduce(
        (sum, content) => sum + (content.duration || 0),
        0
    );

    const presentTypes = new Set(contents.map((content) => content.type));
    const primaryType = TYPE_PRIORITY.find((type) => presentTypes.has(type));
    const meta = TYPE_META[primaryType] || { icon: FileText, label: "Lesson" };

    return { ...meta, duration: formatDuration(totalDuration) };
}

export default function LessonList({
                                       lessons = [],
                                   }) {
    if (!lessons.length) {
        return (
            <p className="px-4 py-3 text-xs text-muted-foreground">
                No lessons available in this module.
            </p>
        );
    }

    return (
        <div className="divide-y divide-slate-800/60">
            {lessons.map((lesson) => {
                const { icon: Icon, label, duration } = getLessonMeta(lesson);

                return (
                    <div
                        key={lesson.id}
                        className="flex items-center justify-between gap-3 px-4 py-3.5"
                    >
                        <div className="flex min-w-0 items-center gap-2.5">
                            <Icon className="h-4 w-4 shrink-0 text-primary" />

                            <span className="truncate text-sm text-foreground">
                                {lesson.title}
                            </span>
                        </div>

                        <span className="shrink-0 text-xs text-muted-foreground">
                            {label}
                            {duration ? ` • ${duration}` : ""}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

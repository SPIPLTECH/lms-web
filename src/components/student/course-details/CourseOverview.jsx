import {
    BookOpen,
    ListChecks,
    Video,
    ClipboardList,
    Clock,
    BarChart2,
} from "lucide-react";

import Card from "@/components/ui/Card";
import { getTopicTreeContents } from "@/lib/courseMapper";

function formatDuration(hours) {
    if (!hours || hours <= 0) return "Self-paced";

    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;

    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
}

export default function CourseOverview({
                                           course,
                                       }) {
    if (!course) return null;

    const totalModules =
        course.modules?.length || 0;

    const totalLessons =
        course.modules?.reduce(
            (count, module) =>
                count +
                (module.lessons?.length || 0),
            0
        ) || 0;

    const totalContents =
        course.modules?.reduce(
            (count, module) =>
                count +
                (module.lessons?.reduce(
                    (lessonCount, lesson) =>
                        lessonCount +
                        (lesson.topics?.reduce(
                            (topicCount, topic) => topicCount + getTopicTreeContents(topic).length,
                            0
                        ) || 0),
                    0
                ) || 0),
            0
        ) || 0;

    const totalQuizzes =
        course.quizzes?.length || 0;

    const stats = [
        { icon: BookOpen, value: totalModules, label: "Modules", color: "text-purple-400", bg: "bg-purple-500/10" },
        { icon: ListChecks, value: totalLessons, label: "Lessons", color: "text-blue-400", bg: "bg-blue-500/10" },
        { icon: Video, value: totalContents, label: "Contents", color: "text-emerald-400", bg: "bg-emerald-500/10" },
        { icon: ClipboardList, value: totalQuizzes, label: "Quizzes", color: "text-primary", bg: "bg-primary/10" },
        { icon: Clock, value: formatDuration(course.estimatedLearningHours), label: "", color: "text-sky-400", bg: "bg-sky-500/10" },
        { icon: BarChart2, value: course.level || "—", label: "", color: "text-rose-400", bg: "bg-rose-500/10" },
    ];

    return (
        <Card padding="p-3">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {stats.map((stat, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${stat.bg} ${stat.color}`}>
                            <stat.icon className="h-3.5 w-3.5" />
                        </span>

                        <span className="text-sm font-semibold text-foreground">
                            {stat.value}
                        </span>

                        {stat.label && (
                            <span className="text-xs text-muted-foreground">
                                {stat.label}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </Card>
    );
}

"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, Target } from "lucide-react";

import useRecommendations from "@/hooks/queries/student/useRecommendations";

/**
 * "Recommended for You" and "Areas to Improve", for the student's own learning.
 *
 * Every card here comes from the backend's existing deterministic decision
 * engine, already resolved to real course content — this component renders
 * what it is given and decides nothing. It also renders nothing at all when
 * there is nothing to say: a new student with no quiz activity sees this
 * section disappear rather than a row of encouraging placeholders.
 */

const MASTERY_TONES = {
    WEAK: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
    DEVELOPING: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    MASTERED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
};

/**
 * Where a recommendation sends the student: into the course player, on the
 * lesson that owns the topic. The player then applies the Phase 2 sequential
 * rules, so a recommendation can never become a way around locked content.
 */
function targetHref(target) {
    if (!target?.courseId) return null;
    const params = new URLSearchParams();
    if (target.lessonId) params.set("lessonId", target.lessonId);
    const query = params.toString();
    return `/student/learn/${target.courseId}${query ? `?${query}` : ""}`;
}

export default function LearningRecommendations({ courseId = null, limit = 3 }) {
    const { data, isLoading } = useRecommendations({ courseId, limit });

    const recommendations = data?.recommendations ?? [];
    const weakAreas = data?.weakAreas ?? [];

    // Nothing to show and nothing loading: render nothing rather than an empty
    // card. This is the ordinary state for a student who hasn't taken a quiz
    // yet, and for one who is on top of everything.
    if (!isLoading && recommendations.length === 0 && weakAreas.length === 0) return null;

    if (isLoading) {
        return (
            <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-[11px] text-muted-foreground">Loading your recommendations…</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {recommendations.length > 0 && (
                <section className="rounded-2xl border border-border bg-card p-4">
                    <h3 className="mb-3 flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-widest text-muted-foreground">
                        <Sparkles size={13} className="shrink-0 text-primary" aria-hidden />
                        Recommended for You
                    </h3>

                    <ul className="space-y-2.5">
                        {recommendations.map((rec) => {
                            const href = targetHref(rec.target);
                            return (
                                <li
                                    key={rec.id}
                                    className="rounded-xl border border-border bg-background/40 p-3 sm:p-3.5"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="min-w-0 flex-1 break-words text-sm font-semibold text-foreground">
                                            {rec.title}
                                        </p>
                                        {rec.masteryLabel && (
                                            <span
                                                className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                                                    MASTERY_TONES[rec.target?.status] ||
                                                    "bg-muted text-muted-foreground"
                                                }`}
                                            >
                                                {rec.masteryLabel}
                                            </span>
                                        )}
                                    </div>

                                    {/* The student-friendly "why". Describes what they did, not a
                                        verdict about them. */}
                                    <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">
                                        {rec.reason}
                                    </p>

                                    {href && (
                                        <Link
                                            href={href}
                                            className="mt-2.5 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-primary/40 px-3 text-xs font-semibold text-primary transition hover:bg-primary/10 sm:min-h-0 sm:py-2"
                                        >
                                            {rec.action?.label || "Review Topic"}
                                            <ArrowRight size={13} className="shrink-0" aria-hidden />
                                        </Link>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}

            {weakAreas.length > 0 && (
                <section className="rounded-2xl border border-border bg-card p-4">
                    <h3 className="mb-3 flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-widest text-muted-foreground">
                        <Target size={13} className="shrink-0 text-amber-500" aria-hidden />
                        Areas to Improve
                    </h3>

                    <ul className="space-y-2">
                        {weakAreas.slice(0, 4).map((area) => (
                            <li
                                key={area.concept}
                                className="flex items-center justify-between gap-2.5 rounded-xl border border-border bg-background/40 px-3 py-2"
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-xs font-semibold text-foreground">
                                        {area.concept}
                                    </p>
                                    <p className="truncate text-[11px] text-muted-foreground">
                                        {area.summary}
                                    </p>
                                </div>
                                <span
                                    className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                                        MASTERY_TONES[area.status] || "bg-muted text-muted-foreground"
                                    }`}
                                >
                                    {area.masteryLabel}
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    );
}

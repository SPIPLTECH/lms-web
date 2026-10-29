"use client";

import Link from "next/link";
import { CalendarCheck, RotateCcw } from "lucide-react";

import { useStudyPlan } from "@/hooks/queries/student/useAdaptiveAgents";

/**
 * Learning Path agent — this week's study plan for one course.
 *
 * The order is the course's own learning sequence; the agent only decides how
 * much of it fits in each day, from the learner's own weekly study hours
 * (profile) and their recent results. Shows today first, then a compact
 * week strip.
 */

const formatDate = (value) =>
    new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" });

const weekday = (isoDate) => new Date(`${isoDate}T00:00:00.000Z`).toLocaleDateString(undefined, { weekday: "short", timeZone: "UTC" });

export default function StudyPlanCard({ courseId, courseTitle }) {
    const { data: plan, isLoading, isError } = useStudyPlan(courseId);
    if (!courseId || isError || (!isLoading && !plan)) return null;

    const today = plan?.days?.[0];

    return (
        <section className="rounded-2xl bg-card border border-border p-5" aria-label="Study plan">
            <div className="mb-3 flex items-start gap-2">
                <CalendarCheck size={16} className="mt-0.5 text-primary" aria-hidden />
                <div className="min-w-0 flex-1">
                    <h3 className="text-h3 text-foreground">Your study plan</h3>
                    {courseTitle && <p className="truncate text-[11px] text-muted-foreground">{courseTitle}</p>}
                </div>
            </div>

            {isLoading && <div className="h-24 rounded-xl bg-muted/50 animate-pulse" />}

            {plan && plan.remainingSteps === 0 && (
                <p className="text-sm text-muted-foreground">Everything in this course is complete — nice work.</p>
            )}

            {plan && plan.remainingSteps > 0 && (
                <>
                    <p className="text-xs text-muted-foreground">
                        About <span className="font-bold text-foreground">{plan.dailyMinutes} min a day</span>
                        {plan.estimatedCompletionAt ? ` · finish around ${formatDate(plan.estimatedCompletionAt)}` : ""}
                        {` · ${plan.remainingSteps} item${plan.remainingSteps === 1 ? "" : "s"} left`}
                    </p>
                    {plan.adjustmentReason && <p className="mt-1 text-xs text-muted-foreground">{plan.adjustmentReason}</p>}

                    <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Today</p>
                    <ul className="mt-1.5 space-y-1.5">
                        {(today?.items ?? []).map((item, i) => (
                            <li key={`${item.kind}-${item.stepIndex ?? item.concept ?? i}`} className="flex items-center gap-2 text-sm">
                                {item.kind === "REVISION" ? (
                                    <RotateCcw size={13} className="shrink-0 text-warning" aria-hidden />
                                ) : (
                                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                                )}
                                <Link href={item.href} className="min-w-0 flex-1 truncate text-foreground hover:text-primary">
                                    {item.title}
                                </Link>
                                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{item.minutes} min</span>
                            </li>
                        ))}
                    </ul>

                    <div className="mt-4 grid grid-cols-7 gap-1" aria-label="This week">
                        {plan.days.map((day) => (
                            <div key={day.date} className="text-center" title={`${day.items.length} item(s), ${day.totalMinutes} min`}>
                                <p className="text-[10px] text-muted-foreground">{weekday(day.date)}</p>
                                <div
                                    className={`mt-1 h-1.5 rounded-full ${day.items.length ? "bg-primary" : "bg-muted"}`}
                                    style={day.items.length ? { opacity: Math.max(0.35, Math.min(1, day.totalMinutes / plan.dailyMinutes)) } : undefined}
                                />
                            </div>
                        ))}
                    </div>
                </>
            )}
        </section>
    );
}

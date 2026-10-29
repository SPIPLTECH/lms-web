"use client";

import Link from "next/link";
import { Flame, X } from "lucide-react";

import { useDismissNudge, useMotivation } from "@/hooks/queries/student/useAdaptiveAgents";

/**
 * Motivation agent — the learner's streak and a few timely nudges.
 *
 * Every message is chosen server-side by a deterministic rule (streak,
 * deadlines, time away from a course, fading concepts, milestones). The card
 * renders nothing until there is a streak or a nudge to show, so a brand-new
 * learner never sees an empty box.
 */

const PRIORITY_DOT = {
    HIGH: "bg-destructive",
    MEDIUM: "bg-warning",
    LOW: "bg-success",
};

function StreakLine({ streak }) {
    if (!streak || streak.currentDays === 0) {
        return (
            <p className="text-xs text-muted-foreground">
                {streak?.longestDays ? `Best streak so far: ${streak.longestDays} days. Learn today to start a new one.` : "Learn today to start a streak."}
            </p>
        );
    }
    return (
        <p className="text-xs text-muted-foreground">
            <span className="font-bold text-foreground">{streak.currentDays}-day streak</span>
            {streak.status === "AT_RISK" ? " — learn today to keep it going" : " — keep it up"}
            {streak.longestDays > streak.currentDays ? ` · best ${streak.longestDays}` : ""}
        </p>
    );
}

export default function MotivationCard() {
    const { data } = useMotivation();
    const dismiss = useDismissNudge();

    const nudges = (data?.nudges ?? []).slice(0, 3);
    const hasStreak = (data?.streak?.currentDays ?? 0) > 0 || (data?.streak?.longestDays ?? 0) > 0;
    if (!data || (!hasStreak && nudges.length === 0)) return null;

    return (
        <section className="rounded-2xl bg-card border border-border p-5" aria-label="Keep going">
            <div className="mb-3 flex items-center gap-2">
                <Flame size={16} className={data.streak.currentDays > 0 ? "text-warning" : "text-muted-foreground"} aria-hidden />
                <h3 className="text-h3 text-foreground">Keep going</h3>
            </div>

            <StreakLine streak={data.streak} />

            {nudges.length > 0 && (
                <ul className="mt-3 space-y-2">
                    {nudges.map((nudge) => (
                        <li key={nudge.id} className="flex items-start gap-3 rounded-xl border border-border bg-background/40 p-3">
                            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT[nudge.priority] ?? PRIORITY_DOT.LOW}`} aria-hidden />
                            <div className="min-w-0 flex-1">
                                {nudge.ctaHref ? (
                                    <Link href={nudge.ctaHref} className="text-sm font-semibold text-foreground hover:text-primary">
                                        {nudge.title}
                                    </Link>
                                ) : (
                                    <p className="text-sm font-semibold text-foreground">{nudge.title}</p>
                                )}
                                <p className="mt-0.5 text-xs text-muted-foreground">{nudge.message}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => dismiss.mutate(nudge.id)}
                                disabled={dismiss.isPending}
                                aria-label={`Dismiss: ${nudge.title}`}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                            >
                                <X size={14} aria-hidden />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

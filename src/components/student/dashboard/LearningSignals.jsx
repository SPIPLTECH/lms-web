"use client";

import { useState } from "react";
import { ChevronDown, TrendingUp } from "lucide-react";

import useLearningSignals from "@/hooks/queries/student/useLearningSignals";

/**
 * "Your learning over time" — how well each concept is holding up.
 *
 * Distinct from the Phase 7 next-action card above it, which answers "what do
 * I do now". This answers "what is actually sticking", which is a slower
 * question and deliberately not a call to action: nothing here is a button.
 * When one of these signals does warrant acting on, it reaches the student
 * through the existing recommendations panel, not through a second set of
 * CTAs competing with the first.
 *
 * Every status, label and sentence is the server's, chosen by a deterministic
 * rule over the student's own answers. This renders them and classifies
 * nothing. Raw evidence counts stay behind the expander, so the default view
 * is readable English rather than a metrics table.
 */

/**
 * Tone per retention status. Deliberately muted next to the next-action card:
 * this is information, and colouring it like an alert would make a fortnight
 * of not revising look like a problem with today.
 */
const TONES = {
    DECAYED: {
        dot: "bg-amber-500",
        chip: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    },
    SHAKY: {
        dot: "bg-sky-500",
        chip: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
    },
    RETAINED: {
        dot: "bg-emerald-500",
        chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    },
    INSUFFICIENT_EVIDENCE: {
        dot: "bg-muted-foreground/40",
        chip: "bg-muted text-muted-foreground",
    },
};

const toneFor = (status) => TONES[status] || TONES.INSUFFICIENT_EVIDENCE;

function SignalRow({ signal }) {
    const [open, setOpen] = useState(false);
    const tone = toneFor(signal.retention?.status);
    const { retention, transfer, evidence } = signal;

    return (
        <li className="rounded-xl border border-border bg-background/40">
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                aria-expanded={open}
                className="flex min-h-[44px] w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition hover:bg-muted/40 sm:px-3.5"
            >
                <span
                    className={`mt-0.5 h-2 w-2 shrink-0 self-start rounded-full ${tone.dot}`}
                    aria-hidden
                />

                {/* Concept and status share a line where there is room and
                    wrap to two where there isn't. The status labels are full
                    sentences ("Practice applying this concept"), so a chip
                    pinned at shrink-0 squeezed the concept name down to one
                    character per line on a phone. */}
                <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="min-w-0 break-words text-sm font-semibold text-foreground">
                            {signal.concept}
                        </span>
                        <span
                            className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${tone.chip}`}
                        >
                            {signal.label}
                        </span>
                    </span>
                    <span className="mt-1 block break-words text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
                        {signal.detail}
                    </span>
                </span>

                <ChevronDown
                    size={14}
                    aria-hidden
                    className={`shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
                />
            </button>

            {/* The evidence, only on request. Counts of the student's own
                answers — never a mastery score or a retention rate, which
                would read as far more precise than they are. */}
            {open && (
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-border/60 px-3 py-2.5 text-[11px] sm:px-3.5">
                    <dt className="text-muted-foreground">Questions answered</dt>
                    <dd className="text-right font-semibold tabular-nums text-foreground">
                        {evidence?.questionsAnswered ?? 0}
                    </dd>

                    <dt className="text-muted-foreground">Answered correctly</dt>
                    <dd className="text-right font-semibold tabular-nums text-foreground">
                        {evidence?.correct ?? 0}
                    </dd>

                    {retention?.delayedAnswered > 0 && (
                        <>
                            <dt className="text-muted-foreground">
                                Revisited after {retention.gapDays}+ days
                            </dt>
                            <dd className="text-right font-semibold tabular-nums text-foreground">
                                {retention.delayedCorrect} of {retention.delayedAnswered} right
                            </dd>
                        </>
                    )}

                    {typeof retention?.daysSinceLastSeen === "number" && (
                        <>
                            <dt className="text-muted-foreground">Last worked on</dt>
                            <dd className="text-right font-semibold tabular-nums text-foreground">
                                {retention.daysSinceLastSeen === 0
                                    ? "Today"
                                    : `${retention.daysSinceLastSeen} day${retention.daysSinceLastSeen === 1 ? "" : "s"} ago`}
                            </dd>
                        </>
                    )}

                    {transfer?.status === "TRANSFERRED" && (
                        <dd className="col-span-2 pt-0.5 text-[11px] text-muted-foreground">
                            Answered correctly in {transfer.distinctCorrectQuizzes} different quizzes.
                        </dd>
                    )}
                </dl>
            )}
        </li>
    );
}

export default function LearningSignals({ courseId = null, limit = 5 }) {
    const { data, isLoading, isError } = useLearningSignals({ courseId });

    const signals = data?.signals ?? [];

    if (isLoading) {
        return (
            <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-[11px] text-muted-foreground">Looking at how your learning is holding up…</p>
            </div>
        );
    }

    // A failed request says so quietly rather than pretending the student has
    // no history — "nothing here" and "we couldn't check" are different facts.
    if (isError) {
        return (
            <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-[11px] text-muted-foreground">
                    Couldn&apos;t load your learning history just now.
                </p>
            </div>
        );
    }

    // The ordinary state for a student who hasn't taken a quiz yet: render
    // nothing rather than an empty card promising insight that isn't there.
    if (signals.length === 0) return null;

    return (
        <section className="rounded-2xl border border-border bg-card p-4">
            <h3 className="mb-1 flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-widest text-muted-foreground">
                <TrendingUp size={13} className="shrink-0 text-primary" aria-hidden />
                Your Learning Over Time
            </h3>
            <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">
                How well each concept is sticking, based on how you&apos;ve done when it came back.
            </p>

            <ul className="space-y-2">
                {signals.slice(0, limit).map((signal) => (
                    <SignalRow key={signal.concept} signal={signal} />
                ))}
            </ul>
        </section>
    );
}

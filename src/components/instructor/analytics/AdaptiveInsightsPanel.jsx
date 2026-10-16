"use client";

import { useEffect, useRef, useState } from "react";
import {
    AlertTriangle,
    Brain,
    ChevronDown,
    GraduationCap,
    Lightbulb,
    TrendingUp,
    Users,
    X,
} from "lucide-react";

import {
    useAdaptiveInsights,
    useAdaptiveLearners,
    useAdaptiveLearner,
} from "@/hooks/queries/instructor/useAdaptiveInsights";

/**
 * Phase 9 — the instructor's view of the adaptive system.
 *
 * Observational. Everything shown here was decided by the deterministic
 * backend; there is no control on this panel that changes a learner's path,
 * recommendation or next action, and that is deliberate — the instructor is
 * given understanding, not a lever into the engine.
 *
 * Two deliberate choices about what is NOT here:
 *
 *  - No risk score. A learner appears on the attention list with the named
 *    reasons that put them there, so an instructor can judge whether they
 *    agree. A single number would be easier to render and impossible to
 *    argue with.
 *  - No mastery probabilities or model internals. The existing instructor
 *    analytics do not expose them and neither does this.
 */

const RETENTION_LABELS = {
    RETAINED: "Holding up",
    SHAKY: "Shaky",
    DECAYED: "Needs review",
    INSUFFICIENT_EVIDENCE: "Not enough evidence yet",
};

const RETENTION_TONES = {
    RETAINED: "bg-emerald-500",
    SHAKY: "bg-sky-500",
    DECAYED: "bg-amber-500",
    INSUFFICIENT_EVIDENCE: "bg-muted-foreground/30",
};

const REASON_TONES = {
    RETENTION_DECAYED: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    REPEATED_INCORRECT: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
    MISCONCEPTION_OPEN: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
    WEAK_TRANSFER: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
    QUALIFYING_FAILED: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
    QUALIFYING_EXHAUSTED: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
    STALLED: "bg-muted text-muted-foreground",
};

const reasonTone = (code) => REASON_TONES[code] || REASON_TONES.STALLED;

/** A headline figure. `value` of null renders as "—", never as 0. */
function Stat({ icon: Icon, label, value, hint }) {
    return (
        <div className="min-w-0 rounded-xl bg-muted/50 p-3 sm:p-4">
            <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-[11px]">
                <Icon size={12} className="shrink-0" aria-hidden />
                <span className="truncate">{label}</span>
            </p>
            <p className="mt-1 text-lg font-bold tabular-nums text-foreground sm:text-2xl">
                {value === null || value === undefined ? "—" : value}
            </p>
            {hint && <p className="truncate text-[10px] text-muted-foreground sm:text-xs">{hint}</p>}
        </div>
    );
}

/** A collapsible block. Sections past the first start closed so the page
 *  opens on what matters rather than on everything at once. */
function Section({ icon: Icon, title, count, children, defaultOpen = false, emptyMessage }) {
    const [open, setOpen] = useState(defaultOpen);
    const isEmpty = count === 0;

    return (
        <section className="rounded-2xl border border-border bg-card">
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                aria-expanded={open}
                className="flex min-h-[52px] w-full items-center gap-2.5 px-4 py-3 text-left transition hover:bg-muted/40"
            >
                <Icon size={15} className="shrink-0 text-primary" aria-hidden />
                <span className="min-w-0 flex-1 break-words text-sm font-bold text-foreground">
                    {title}
                </span>
                {!isEmpty && (
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold tabular-nums text-muted-foreground">
                        {count}
                    </span>
                )}
                <ChevronDown
                    size={15}
                    aria-hidden
                    className={`shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
                />
            </button>

            {open && (
                <div className="border-t border-border/60 px-4 py-3">
                    {isEmpty ? (
                        <p className="text-xs text-muted-foreground">{emptyMessage}</p>
                    ) : (
                        children
                    )}
                </div>
            )}
        </section>
    );
}

/** The learner drill-down, in a dialog so the overview keeps its place. */
function LearnerDetail({ courseId, studentId, onClose }) {
    const { data, isLoading, isError } = useAdaptiveLearner(courseId, studentId);
    const closeRef = useRef(null);
    const restoreFocusRef = useRef(null);

    // Dialog behaviour a keyboard user expects and a modal without it denies:
    // Escape closes, focus moves inside on open, and focus returns to whatever
    // opened it on close. Without the last one, dismissing the dialog drops
    // focus to the top of the document and the list position is lost.
    useEffect(() => {
        restoreFocusRef.current = document.activeElement;
        closeRef.current?.focus();

        const onKeyDown = (event) => {
            if (event.key === "Escape") {
                event.stopPropagation();
                onClose();
            }
        };

        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
            if (restoreFocusRef.current instanceof HTMLElement) {
                restoreFocusRef.current.focus();
            }
        };
    }, [onClose]);

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Learner adaptive detail"
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6"
        >
            <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-border bg-card sm:rounded-2xl">
                <div className="sticky top-0 flex items-center gap-3 border-b border-border bg-card px-4 py-3">
                    <h3 className="min-w-0 flex-1 break-words text-sm font-bold text-foreground">
                        {data?.learner?.name || "Learner"}
                    </h3>
                    <button
                        ref={closeRef}
                        type="button"
                        onClick={onClose}
                        aria-label="Close learner detail"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none transition hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        <X size={16} aria-hidden />
                    </button>
                </div>

                <div className="space-y-4 px-4 py-4">
                    {isLoading && (
                        <p role="status" className="text-xs text-muted-foreground">
                            Loading learner detail…
                        </p>
                    )}

                    {isError && (
                        <p role="alert" className="text-xs text-muted-foreground">
                            Couldn&apos;t load this learner&apos;s detail.
                        </p>
                    )}

                    {data && (
                        <>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                <Stat icon={Users} label="Progress" value={`${data.learner.progressPercent}%`} />
                                <Stat icon={Brain} label="Completed" value={data.position.completed} hint={`of ${data.position.total}`} />
                                <Stat icon={GraduationCap} label="Qualified out" value={data.position.qualified} />
                                <Stat icon={AlertTriangle} label="Locked" value={data.position.locked} />
                            </div>

                            <div className="rounded-xl bg-muted/40 p-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    Currently on
                                </p>
                                <p className="mt-0.5 break-words text-sm font-semibold text-foreground">
                                    {data.position.current || "Not started"}
                                </p>
                            </div>

                            {/* What the engine is telling this learner — shown so
                                the instructor knows, not so they can change it. */}
                            <div className="rounded-xl border border-primary/25 bg-primary/5 p-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    {data.adaptive.nextAction.headline}
                                </p>
                                <p className="mt-0.5 break-words text-sm font-semibold text-foreground">
                                    {data.adaptive.nextAction.title}
                                </p>
                                <p className="mt-1 break-words text-xs text-muted-foreground">
                                    {data.adaptive.nextAction.reason}
                                </p>
                            </div>

                            {data.reasons.length > 0 && (
                                <div>
                                    <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                        Why they&apos;re flagged
                                    </p>
                                    <ul className="flex flex-wrap gap-1.5">
                                        {data.reasons.map((reason) => (
                                            <li
                                                key={reason.code + reason.label}
                                                className={`rounded px-2 py-1 text-[11px] font-semibold ${reasonTone(reason.code)}`}
                                            >
                                                {reason.label}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div>
                                <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    Concepts over time
                                </p>
                                {data.signals.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">
                                        No quiz evidence for this learner yet.
                                    </p>
                                ) : (
                                    <ul className="space-y-1.5">
                                        {data.signals.map((signal) => (
                                            <li
                                                key={signal.concept}
                                                className="flex items-center gap-2 rounded-lg bg-background/40 px-2.5 py-2"
                                            >
                                                <span
                                                    className={`h-2 w-2 shrink-0 rounded-full ${RETENTION_TONES[signal.retention.status]}`}
                                                    aria-hidden
                                                />
                                                <span className="min-w-0 flex-1 break-words text-xs font-semibold text-foreground">
                                                    {signal.concept}
                                                </span>
                                                <span className="shrink-0 text-[10px] text-muted-foreground">
                                                    {RETENTION_LABELS[signal.retention.status]}
                                                </span>
                                                <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                                                    {signal.evidence.correct}/{signal.evidence.questionsAnswered}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            {data.misconceptions.length > 0 && (
                                <div>
                                    <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                        Misconceptions
                                    </p>
                                    <ul className="space-y-1">
                                        {data.misconceptions.map((row, index) => (
                                            <li
                                                key={`${row.label}:${index}`}
                                                className="flex items-center gap-2 text-xs text-foreground"
                                            >
                                                <span className="min-w-0 flex-1 break-words">
                                                    {row.label}
                                                    {row.concept ? ` · ${row.concept}` : ""}
                                                </span>
                                                <span className="shrink-0 text-[10px] text-muted-foreground">
                                                    {row.unresolved ? "Unresolved" : "Resolved"}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {data.qualifyingTests.length > 0 && (
                                <div>
                                    <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                        Qualifying tests
                                    </p>
                                    <ul className="space-y-1">
                                        {data.qualifyingTests.map((row) => (
                                            <li key={row.quizTitle} className="flex items-center gap-2 text-xs">
                                                <span className="min-w-0 flex-1 break-words text-foreground">
                                                    {row.quizTitle}
                                                </span>
                                                <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                                                    {row.attempts} attempt{row.attempts === 1 ? "" : "s"} ·{" "}
                                                    {row.passed ? "passed" : "not passed"}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function AdaptiveInsightsPanel({ courseId }) {
    const [openLearner, setOpenLearner] = useState(null);

    const { data: insights, isLoading, isError } = useAdaptiveInsights(courseId);
    const { data: learnerPage } = useAdaptiveLearners(courseId, { limit: 20 });

    if (!courseId) return null;

    if (isLoading) {
        return (
            <div className="rounded-2xl border border-border bg-card p-5">
                <p className="text-xs text-muted-foreground">Loading adaptive insights…</p>
            </div>
        );
    }

    // A failed or refused request says so, rather than rendering an empty
    // course — "no data" and "we couldn't look" are different facts.
    if (isError || !insights) {
        return (
            <div className="rounded-2xl border border-border bg-card p-5">
                <h2 className="text-sm font-bold text-foreground">Adaptive Learning</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                    Couldn&apos;t load adaptive insights for this course. If it isn&apos;t one of yours,
                    you won&apos;t have access to its learner data.
                </p>
            </div>
        );
    }

    const { summary, retention, concepts, misconceptions, qualifyingTests } = insights;
    const learners = learnerPage?.learners ?? [];
    const retentionTotal = Object.values(retention).reduce((sum, n) => sum + n, 0);

    return (
        <div className="space-y-3">
            <div>
                <h2 className="text-lg font-bold tracking-tight text-foreground">Adaptive Learning</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                    What the adaptive system is seeing across {insights.course.title}.
                </p>
            </div>

            {/* Above the fold: the four figures worth acting on. */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
                <Stat icon={Users} label="Learners" value={summary.learnersEnrolled} hint={`${summary.learnersWithEvidence} with quiz evidence`} />
                <Stat icon={AlertTriangle} label="Need attention" value={summary.learnersNeedingAttention} />
                <Stat icon={TrendingUp} label="Durable understanding" value={summary.learnersShowingImprovement} />
                <Stat icon={Brain} label="Average progress" value={summary.averageProgressPercent === null ? null : `${summary.averageProgressPercent}%`} />
            </div>

            <Section
                icon={AlertTriangle}
                title="Learners needing attention"
                count={learnerPage?.total ?? 0}
                defaultOpen
                emptyMessage="No learner is currently showing a reason for concern."
            >
                {/* A scroll container rather than a table: at 390px a table
                    either overflows the page or shrinks its text to nothing. */}
                <ul className="space-y-2">
                    {learners.map((row) => (
                        <li key={row.studentId}>
                            <button
                                type="button"
                                onClick={() => setOpenLearner(row.studentId)}
                                className="w-full rounded-xl border border-border bg-background/40 px-3 py-2.5 text-left transition hover:bg-muted/40"
                            >
                                <span className="flex items-center gap-2">
                                    <span className="min-w-0 flex-1 break-words text-sm font-semibold text-foreground">
                                        {row.name}
                                    </span>
                                    <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                                        {row.progressPercent}%
                                    </span>
                                </span>
                                <span className="mt-1.5 flex flex-wrap gap-1.5">
                                    {row.reasons.map((reason) => (
                                        <span
                                            key={reason.code + reason.label}
                                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${reasonTone(reason.code)}`}
                                        >
                                            {reason.label}
                                        </span>
                                    ))}
                                </span>
                            </button>
                        </li>
                    ))}
                    {learnerPage && learnerPage.total > learners.length && (
                        <li className="pt-1 text-[11px] text-muted-foreground">
                            Showing {learners.length} of {learnerPage.total}.
                        </li>
                    )}
                </ul>
            </Section>

            <Section
                icon={TrendingUp}
                title="Retention across the course"
                count={retentionTotal}
                emptyMessage="No learner has revisited a concept after a gap yet, so retention can't be measured."
            >
                <ul className="space-y-2">
                    {Object.entries(retention).map(([status, count]) => (
                        <li key={status} className="flex items-center gap-2.5">
                            <span className={`h-2 w-2 shrink-0 rounded-full ${RETENTION_TONES[status]}`} aria-hidden />
                            <span className="min-w-0 flex-1 text-xs text-foreground">{RETENTION_LABELS[status]}</span>
                            <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                                {count}
                            </span>
                        </li>
                    ))}
                </ul>
                <p className="mt-2.5 text-[11px] text-muted-foreground">
                    Counted per learner per concept, only where a concept was revisited after a break.
                </p>
            </Section>

            <Section
                icon={Lightbulb}
                title="Concepts learners struggle with"
                count={concepts.length}
                emptyMessage="No quiz evidence for this course yet."
            >
                <div className="-mx-1 overflow-x-auto px-1">
                    <ul className="min-w-[320px] space-y-2">
                        {concepts.map((row) => (
                            <li key={row.concept} className="rounded-xl bg-background/40 px-3 py-2">
                                <div className="flex items-center gap-2">
                                    <span className="min-w-0 flex-1 break-words text-xs font-semibold text-foreground">
                                        {row.concept}
                                    </span>
                                    <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                                        {row.learnersStruggling}/{row.learners} struggling
                                    </span>
                                </div>
                                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                                    <span>{row.incorrect} incorrect answers</span>
                                    {row.retention.DECAYED > 0 && <span>{row.retention.DECAYED} need review</span>}
                                    {row.learnersWithMisconception > 0 && (
                                        <span>{row.learnersWithMisconception} with a misconception</span>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </Section>

            <Section
                icon={Brain}
                title="Misconceptions"
                count={misconceptions.length}
                emptyMessage="No misconceptions have been detected for this course's learners."
            >
                <ul className="space-y-2">
                    {misconceptions.map((row) => (
                        <li key={row.label} className="rounded-xl bg-background/40 px-3 py-2">
                            <div className="flex items-center gap-2">
                                <span className="min-w-0 flex-1 break-words text-xs font-semibold text-foreground">
                                    {row.label}
                                </span>
                                <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                                    {row.learnersUnresolved} unresolved / {row.learnersAffected}
                                </span>
                            </div>
                            {row.concepts.length > 0 && (
                                <p className="mt-0.5 break-words text-[10px] text-muted-foreground">
                                    {row.concepts.join(" · ")}
                                </p>
                            )}
                        </li>
                    ))}
                </ul>
            </Section>

            <Section
                icon={GraduationCap}
                title="Qualifying tests"
                count={qualifyingTests.length}
                emptyMessage="No learner has attempted a qualifying test on this course."
            >
                <ul className="space-y-2">
                    {qualifyingTests.map((row) => (
                        <li key={row.quizTitle} className="rounded-xl bg-background/40 px-3 py-2">
                            <div className="flex items-center gap-2">
                                <span className="min-w-0 flex-1 break-words text-xs font-semibold text-foreground">
                                    {row.quizTitle}
                                </span>
                                <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                                    {row.passRate === null ? "—" : `${row.passRate}% pass`}
                                </span>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                                <span>{row.learnersAttempted} attempted</span>
                                <span>{row.learnersPassed} qualified</span>
                                {row.learnersStillTrying > 0 && <span>{row.learnersStillTrying} still trying</span>}
                                {row.learnersExhausted > 0 && <span>{row.learnersExhausted} out of attempts</span>}
                                {/* Null, not zero: "nobody has qualified" must not
                                    render as "qualified on attempt 0". */}
                                <span>
                                    {row.averageAttemptsToQualify === null
                                        ? "no one qualified yet"
                                        : `${row.averageAttemptsToQualify} attempts to qualify on average`}
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            </Section>

            {openLearner && (
                <LearnerDetail
                    courseId={courseId}
                    studentId={openLearner}
                    onClose={() => setOpenLearner(null)}
                />
            )}
        </div>
    );
}

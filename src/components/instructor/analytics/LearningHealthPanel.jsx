"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, HeartPulse, RefreshCw, X } from "lucide-react";

import {
    useCourseLearningHealth,
    useLearnerHealth,
    useRecomputeLearningHealth,
} from "@/hooks/queries/instructor/useLearningHealth";

/**
 * Learning Health agent (adaptive Phase 1) — who may need a check-in, and why.
 *
 * Everything shown is computed by the deterministic backend agent. Like
 * AdaptiveInsightsPanel, a learner is shown with a LEVEL and the named
 * reasons behind it, never with the raw risk number: the instructor should be
 * able to read why, and disagree.
 */

const LEVELS = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "NEW"];

const LEVEL_LABELS = {
    CRITICAL: "Critical",
    HIGH: "High risk",
    MEDIUM: "Watch",
    LOW: "On track",
    NEW: "New",
};

const LEVEL_TONES = {
    CRITICAL: "bg-destructive text-destructive-foreground",
    HIGH: "bg-destructive/10 text-destructive",
    MEDIUM: "bg-warning/10 text-warning",
    LOW: "bg-success/10 text-success",
    NEW: "bg-muted text-muted-foreground",
};

const LEVEL_DOTS = {
    CRITICAL: "bg-destructive",
    HIGH: "bg-destructive/60",
    MEDIUM: "bg-warning",
    LOW: "bg-success",
    NEW: "bg-muted-foreground/30",
};

const TREND_LABELS = { IMPROVING: "Improving", DECLINING: "Declining", STABLE: "Steady" };

function timeAgo(value) {
    if (!value) return null;
    const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.round(hours / 24)}d ago`;
}

/** From the learner's state; "never active" is said as such, not as days since enrolment. */
function lastActive({ inactivityDays: days, lastActivityAt }) {
    if (!lastActivityAt) return "No activity yet";
    if (days === 0) return "Active today";
    if (days === 1) return "Last active yesterday";
    return `Last active ${days} days ago`;
}

function LevelBadge({ level }) {
    return (
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${LEVEL_TONES[level] ?? LEVEL_TONES.NEW}`}>
            {LEVEL_LABELS[level] ?? level}
        </span>
    );
}

/** A 0-100 score as a bar. null renders as "No evidence yet", never as 0. */
function ScoreBar({ label, value }) {
    const hasValue = typeof value === "number";
    return (
        <div>
            <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-medium text-foreground">{label}</span>
                <span className="text-[11px] tabular-nums text-muted-foreground">
                    {hasValue ? `${Math.round(value)}/100` : "No evidence yet"}
                </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                {hasValue && (
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
                )}
            </div>
        </div>
    );
}

/** One square per day, coloured by that day's level. */
function HistoryStrip({ history }) {
    if (!history?.length) {
        return <p className="text-xs text-muted-foreground">No history yet — it builds up one day at a time.</p>;
    }
    return (
        <div className="flex flex-wrap gap-1" aria-label="Risk level over recent days">
            {history.map((day) => {
                const date = new Date(day.date).toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" });
                return (
                    <span
                        key={day.date}
                        title={`${date}: ${LEVEL_LABELS[day.riskLevel] ?? day.riskLevel}`}
                        className={`h-4 w-4 rounded-sm ${LEVEL_DOTS[day.riskLevel] ?? LEVEL_DOTS.NEW}`}
                    />
                );
            })}
        </div>
    );
}

function LearnerDetail({ courseId, studentId, onClose }) {
    const { data, isLoading, isError } = useLearnerHealth(courseId, studentId);
    const closeRef = useRef(null);
    const restoreFocusRef = useRef(null);

    // Escape closes, focus moves inside on open and returns on close — same
    // dialog behaviour as AdaptiveInsightsPanel's learner detail.
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
            if (restoreFocusRef.current instanceof HTMLElement) restoreFocusRef.current.focus();
        };
    }, [onClose]);

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Learner learning health"
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6"
        >
            <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border bg-card sm:rounded-2xl">
                <div className="sticky top-0 flex items-center gap-3 border-b border-border bg-card px-4 py-3">
                    <h3 className="min-w-0 flex-1 break-words text-sm font-bold text-foreground">{data?.name || "Learner"}</h3>
                    {data && <LevelBadge level={data.riskLevel} />}
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
                    {isLoading && <p role="status" className="text-xs text-muted-foreground">Loading…</p>}
                    {isError && <p role="alert" className="text-xs text-muted-foreground">Couldn&apos;t load this learner.</p>}

                    {data && (
                        <>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Why</p>
                                {data.riskReasons.length > 0 ? (
                                    <ul className="mt-1.5 space-y-1">
                                        {data.riskReasons.map((reason) => (
                                            <li key={reason} className="text-sm text-foreground">• {reason}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="mt-1.5 text-sm text-muted-foreground">Nothing stands out — this learner is on track.</p>
                                )}
                            </div>

                            <div className="space-y-3 rounded-xl bg-muted/40 p-3">
                                <ScoreBar label="Engagement" value={data.engagementScore} />
                                <ScoreBar label="Performance" value={data.performanceScore} />
                                <ScoreBar label="Consistency" value={data.consistencyScore} />
                            </div>

                            <dl className="grid grid-cols-2 gap-2 text-xs">
                                <div className="rounded-xl bg-muted/40 p-3">
                                    <dt className="text-muted-foreground">Progress</dt>
                                    <dd className="mt-0.5 font-bold text-foreground">{data.progressPercent}%</dd>
                                </div>
                                <div className="rounded-xl bg-muted/40 p-3">
                                    <dt className="text-muted-foreground">Quiz trend</dt>
                                    <dd className="mt-0.5 font-bold text-foreground">{TREND_LABELS[data.improvementTrend] ?? "Steady"}</dd>
                                </div>
                            </dl>

                            <div>
                                <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Last 30 days</p>
                                <HistoryStrip history={data.history} />
                            </div>

                            <p className="text-[11px] text-muted-foreground">
                                {lastActive(data)} · Updated {timeAgo(data.computedAt)}
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function LearningHealthPanel({ courseId }) {
    const [riskLevel, setRiskLevel] = useState(null);
    const [openStudentId, setOpenStudentId] = useState(null);
    const [refreshMessage, setRefreshMessage] = useState(null);

    const { data, isLoading, isError } = useCourseLearningHealth(courseId, { riskLevel });
    const recompute = useRecomputeLearningHealth(courseId);
    const closeDetail = useCallback(() => setOpenStudentId(null), []);

    // Rendered with key={courseId}, so switching course remounts it with a
    // clean filter and no stale message — no reset effect needed.
    if (!courseId) return null;

    const counts = data?.summary?.counts ?? {};
    const learners = data?.learners ?? [];

    const onRefresh = () => {
        setRefreshMessage(null);
        recompute.mutate(undefined, {
            onError: (error) => {
                const retry = error?.response?.data?.retryAfterSeconds;
                setRefreshMessage(
                    retry ? `Refreshed recently — try again in ${Math.ceil(retry / 60)} min.` : "Couldn't refresh right now."
                );
            },
        });
    };

    return (
        <section className="rounded-2xl border border-border bg-card">
            <div className="flex flex-wrap items-center gap-2.5 px-4 py-3">
                <HeartPulse size={15} className="shrink-0 text-primary" aria-hidden />
                <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-bold text-foreground">Learning health</h2>
                    <p className="text-[11px] text-muted-foreground">Who may need a check-in, and why.</p>
                </div>
                {data?.summary?.computedAt && (
                    <span className="text-[11px] text-muted-foreground">Updated {timeAgo(data.summary.computedAt)}</span>
                )}
                <button
                    type="button"
                    onClick={onRefresh}
                    disabled={recompute.isPending}
                    className="flex min-h-[36px] items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-semibold text-foreground transition hover:bg-muted disabled:opacity-60"
                >
                    <RefreshCw size={13} aria-hidden className={recompute.isPending ? "animate-spin" : ""} />
                    Refresh now
                </button>
            </div>

            {refreshMessage && (
                <p role="status" className="px-4 pb-2 text-[11px] text-muted-foreground">{refreshMessage}</p>
            )}

            <div className="border-t border-border/60 px-4 py-3">
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by level">
                    <button
                        type="button"
                        onClick={() => setRiskLevel(null)}
                        aria-pressed={riskLevel === null}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition ${riskLevel === null ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                    >
                        All {data?.summary?.total ?? ""}
                    </button>
                    {LEVELS.map((level) => (
                        <button
                            key={level}
                            type="button"
                            onClick={() => setRiskLevel(level === riskLevel ? null : level)}
                            aria-pressed={riskLevel === level}
                            className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition ${riskLevel === level ? "ring-2 ring-primary " : ""}${LEVEL_TONES[level]}`}
                        >
                            {LEVEL_LABELS[level]} {counts[level] ?? 0}
                        </button>
                    ))}
                </div>

                <div className="mt-3">
                    {isLoading && <p role="status" className="text-xs text-muted-foreground">Loading learning health…</p>}
                    {isError && <p role="alert" className="text-xs text-muted-foreground">Couldn&apos;t load learning health.</p>}
                    {data && learners.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                            {riskLevel ? "No learners at this level." : "No enrolled learners yet."}
                        </p>
                    )}

                    {learners.length > 0 && (
                        <ul className="divide-y divide-border/60">
                            {learners.map((learner) => (
                                <li key={learner.studentId}>
                                    <button
                                        type="button"
                                        onClick={() => setOpenStudentId(learner.studentId)}
                                        className="flex w-full items-start gap-3 py-2.5 text-left transition hover:bg-muted/40"
                                    >
                                        <Activity size={14} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="min-w-0 break-words text-sm font-semibold text-foreground">
                                                    {learner.name || learner.email || "Learner"}
                                                </span>
                                                <LevelBadge level={learner.riskLevel} />
                                            </div>
                                            {learner.riskReasons.length > 0 && (
                                                <p className="mt-0.5 text-xs text-muted-foreground">
                                                    {learner.riskReasons.slice(0, 2).join(" · ")}
                                                </p>
                                            )}
                                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                                                {lastActive(learner)} · {learner.progressPercent}% complete
                                            </p>
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {openStudentId && (
                <LearnerDetail courseId={courseId} studentId={openStudentId} onClose={closeDetail} />
            )}
        </section>
    );
}

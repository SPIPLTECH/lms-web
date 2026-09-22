"use client";

import {
    ArrowRight,
    BookOpen,
    CheckCircle2,
    ChevronDown,
    Lightbulb,
    RotateCcw,
    Timer,
    XCircle,
} from "lucide-react";
import { useState } from "react";

import Button from "@/components/ui/Button";

/**
 * What a qualifying test decided, and what to do next.
 *
 * Pass: the target is skipped and the next item is open. Fail: it stays in the
 * learning path, with the concepts that went wrong and the content to revisit.
 *
 * Every number and every recommendation here comes from the server's
 * `qualification` block on the quiz result — including whether another attempt
 * is allowed. This component decides nothing; it renders a decision.
 */

/** One figure in the result grid. */
function Stat({ label, value, detail, tone = "default" }) {
    const toneClass =
        tone === "pass"
            ? "text-emerald-600 dark:text-emerald-400"
            : tone === "fail"
              ? "text-red-600 dark:text-red-400"
              : "text-foreground";

    return (
        <div className="min-w-0 rounded-lg bg-muted/50 p-2.5 sm:rounded-xl sm:p-3">
            <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-[11px]">
                {label}
            </p>
            <p className={`mt-1 break-words text-sm font-semibold tabular-nums sm:text-base ${toneClass}`}>
                {value}
            </p>
            {detail && (
                <p className="truncate text-[10px] tabular-nums text-muted-foreground sm:text-xs">{detail}</p>
            )}
        </div>
    );
}

function formatDuration(totalSeconds) {
    if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return null;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

/** Why this concept is worth revisiting, in the student's terms. */
function describeConcept(concept) {
    const parts = [];
    if (concept.incorrect > 0) parts.push(`${concept.incorrect} wrong`);
    if (concept.unanswered > 0) parts.push(`${concept.unanswered} unanswered`);
    if (concept.skipped > 0) parts.push(`${concept.skipped} skipped`);
    if (concept.hintsUsed > 0) parts.push(`${concept.hintsUsed} hint${concept.hintsUsed === 1 ? "" : "s"}`);
    return parts.join(" · ");
}

export default function QualificationResultPanel({
    qualification,
    targetTitle,
    onContinue,
    onOpenContent,
    onRetake,
}) {
    const [historyOpen, setHistoryOpen] = useState(false);

    if (!qualification) return null;

    const {
        qualified,
        percentage,
        passingScore,
        score,
        totalMarks,
        attemptNumber,
        maxAttempts,
        unlimitedAttempts,
        timeTakenSeconds,
        hintsUsed = 0,
        questionBreakdown,
        weakConcepts = [],
        recommendedContent = [],
        attempts = [],
        canRetake = false,
    } = qualification;

    const targetLabel = qualification.target?.kind === "TOPIC" ? "topic" : "lesson";
    const title = targetTitle || qualification.target?.title || `this ${targetLabel}`;
    const breakdown = questionBreakdown || {};
    const timeTaken = formatDuration(timeTakenSeconds);

    const attemptLabel = unlimitedAttempts
        ? `Attempt ${attemptNumber}`
        : `Attempt ${attemptNumber} of ${maxAttempts}`;

    return (
        <div
            className={`rounded-2xl border p-4 sm:p-6 ${
                qualified
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-amber-500/30 bg-amber-500/5"
            }`}
        >
            {/* HEADLINE */}
            <div className="flex items-start gap-3">
                <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        qualified
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    }`}
                >
                    {qualified ? (
                        <CheckCircle2 className="h-5 w-5" aria-hidden />
                    ) : (
                        <XCircle className="h-5 w-5" aria-hidden />
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-[11px]">
                        Qualifying Test Result
                    </p>
                    <h3 className="mt-0.5 text-base font-bold text-foreground sm:text-lg">
                        {qualified
                            ? "You've demonstrated sufficient understanding of this content"
                            : "You haven't reached the qualifying score yet"}
                    </h3>
                    <p className="mt-1 break-words text-xs text-foreground sm:text-sm">
                        {qualified ? (
                            <>
                                <span className="font-semibold">{title}</span> is marked as skipped and the
                                next item is now open. It stays in your course — you can still open it any
                                time.
                            </>
                        ) : (
                            <>
                                <span className="font-semibold">{title}</span> stays part of your learning
                                path.
                            </>
                        )}
                    </p>
                </div>
            </div>

            {/* RESULT FIGURES */}
            <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
                <Stat
                    label="Score"
                    value={`${percentage}%`}
                    detail={Number.isFinite(totalMarks) ? `${score} / ${totalMarks} marks` : null}
                    tone={qualified ? "pass" : "fail"}
                />
                <Stat label="Required" value={`${passingScore}%`} />
                <Stat
                    label="Status"
                    value={qualified ? "Qualified" : "Not Qualified"}
                    tone={qualified ? "pass" : "fail"}
                />
                <Stat label="Attempt" value={attemptLabel} />
                <Stat
                    label="Questions"
                    value={`${breakdown.total ?? 0} total`}
                    detail={`${breakdown.correct ?? 0} correct · ${breakdown.incorrect ?? 0} incorrect${
                        breakdown.skipped ? ` · ${breakdown.skipped} skipped` : ""
                    }`}
                />
                <Stat
                    label="Hints used"
                    value={hintsUsed > 0 ? String(hintsUsed) : "None"}
                    detail={timeTaken ? `Time ${timeTaken}` : null}
                />
            </div>

            {/* Time on its own row when there was no hint line to carry it. */}
            {timeTaken && hintsUsed === 0 && (
                <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground sm:text-xs">
                    <Timer size={12} className="shrink-0" aria-hidden />
                    Time taken {timeTaken}
                </p>
            )}

            {/* AREAS TO REVIEW */}
            {!qualified && weakConcepts.length > 0 && (
                <div className="mt-4 sm:mt-5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-[11px]">
                        Areas to review
                    </p>
                    <ul className="mt-2 flex flex-wrap gap-1.5 sm:gap-2">
                        {weakConcepts.map((concept) => (
                            <li
                                key={concept.concept}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-muted/60 px-2.5 py-1 text-[11px] text-foreground sm:text-xs"
                            >
                                <span className="font-medium">{concept.concept}</span>
                                <span className="tabular-nums text-muted-foreground">
                                    {describeConcept(concept)}
                                </span>
                                {concept.hintsUsed > 0 && (
                                    <Lightbulb
                                        size={11}
                                        className="shrink-0 text-amber-600 dark:text-amber-400"
                                        aria-label="hint used"
                                    />
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* RECOMMENDED CONTENT */}
            {!qualified && recommendedContent.length > 0 && (
                <div className="mt-4 sm:mt-5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-[11px]">
                        Recommended before continuing
                    </p>
                    <ul className="mt-2 space-y-1.5 sm:space-y-2">
                        {recommendedContent.map((item) => (
                            <li key={item.id}>
                                <button
                                    type="button"
                                    onClick={() => onOpenContent?.(item)}
                                    disabled={!onOpenContent}
                                    className="flex min-h-[44px] w-full items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2 text-left transition hover:border-primary/40 disabled:cursor-default disabled:hover:border-border sm:px-4"
                                >
                                    <BookOpen size={15} className="shrink-0 text-primary" aria-hidden />
                                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground sm:text-sm">
                                        {item.title}
                                    </span>
                                    {item.matchedConcepts?.length > 0 && (
                                        <span className="hidden shrink-0 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400 sm:inline">
                                            {item.matchedConcepts[0]}
                                        </span>
                                    )}
                                    {onOpenContent && (
                                        <ArrowRight
                                            size={14}
                                            className="shrink-0 text-muted-foreground"
                                            aria-hidden
                                        />
                                    )}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* ATTEMPT HISTORY — only once there is more than this attempt to show. */}
            {attempts.length > 1 && (
                <div className="mt-4 sm:mt-5">
                    <button
                        type="button"
                        onClick={() => setHistoryOpen((open) => !open)}
                        aria-expanded={historyOpen}
                        className="inline-flex min-h-[44px] items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition hover:text-foreground sm:min-h-0 sm:text-[11px]"
                    >
                        <ChevronDown
                            size={13}
                            className={`shrink-0 transition-transform ${historyOpen ? "rotate-180" : ""}`}
                            aria-hidden
                        />
                        Previous attempts ({attempts.length})
                    </button>

                    {historyOpen && (
                        <ul className="mt-2 space-y-1.5">
                            {attempts.map((attempt) => (
                                <li
                                    key={attempt.id}
                                    className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs sm:text-sm ${
                                        attempt.attemptNumber === attemptNumber
                                            ? "border-primary/40 bg-primary/5"
                                            : "border-border bg-card"
                                    }`}
                                >
                                    <span className="shrink-0 font-medium text-foreground">
                                        Attempt {attempt.attemptNumber}
                                    </span>
                                    <span className="min-w-0 flex-1 truncate text-right tabular-nums text-muted-foreground">
                                        {attempt.percentage}%
                                    </span>
                                    <span
                                        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                                            attempt.passed
                                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                                                : "bg-red-500/15 text-red-700 dark:text-red-400"
                                        }`}
                                    >
                                        {attempt.passed ? "Passed" : "Failed"}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {/* ACTIONS */}
            <div className="mt-4 flex flex-col gap-2 sm:mt-5 sm:flex-row">
                <Button
                    type="button"
                    onClick={onContinue}
                    className="h-10 min-h-0 w-full px-4 text-xs font-semibold sm:w-auto sm:text-sm"
                >
                    {qualified ? "Continue to Next Lesson" : "Continue Learning"}
                </Button>
                {!qualified && canRetake && onRetake && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onRetake}
                        className="inline-flex h-10 min-h-0 w-full items-center justify-center gap-1.5 px-4 text-xs sm:w-auto sm:text-sm"
                    >
                        <RotateCcw size={14} aria-hidden />
                        Try Qualifying Test Again
                    </Button>
                )}
            </div>

            {!qualified && !canRetake && (
                <p className="mt-2 text-[11px] text-muted-foreground sm:text-xs">
                    You&apos;ve used all attempts for this qualifying test. Work through the {targetLabel} to
                    continue.
                </p>
            )}
        </div>
    );
}

"use client";

import { CheckCircle2, Target } from "lucide-react";

/**
 * A test-series quiz's weak areas: each subject/topic the student scored
 * below the course's threshold on in this attempt, weakest first.
 *
 * @param {object} props
 * @param {object|null} props.testReview  `testReview` from GET /quizzes/:id/result
 *   ({ threshold, weakAreas: [{ subject, topic, correct, total }] }); renders nothing when null.
 */
export default function WeakAreasCard({ testReview, className = "" }) {
    if (!testReview) return null;
    const areas = testReview.weakAreas || [];

    if (areas.length === 0) {
        return (
            <div className={`flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-left text-xs font-medium text-emerald-700 dark:text-emerald-300 sm:px-4 sm:text-sm ${className}`}>
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                No weak areas in this test, well done.
            </div>
        );
    }

    return (
        <div className={`rounded-xl border border-rose-500/25 bg-rose-500/5 px-3 py-3 text-left sm:px-4 sm:py-4 ${className}`}>
            <p className="flex items-center gap-2 text-xs font-semibold text-foreground sm:text-sm">
                <Target className="h-4 w-4 shrink-0 text-rose-500" aria-hidden />
                You need more work on these areas:
            </p>
            <ul className="mt-2 space-y-1 text-xs text-foreground sm:text-sm">
                {areas.map((area) => (
                    <li key={`${area.subject}|${area.topic}`} className="flex gap-2">
                        <span aria-hidden className="text-rose-500">•</span>
                        <span className="min-w-0">
                            <span className="font-medium">{area.subject}:</span> {area.topic}{" "}
                            <span className="tabular-nums text-muted-foreground">
                                ({area.correct}/{area.total} correct)
                            </span>
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

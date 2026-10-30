"use client";

import { ClipboardCheck, ExternalLink, Lock, Target } from "lucide-react";

/**
 * A test-series course's review. Until every test is submitted it shows the
 * progress toward unlocking it; after, each section's score, the weakest
 * areas across all tests, and the course to take for each weak section (or
 * the lower-scoring section's, when none is weak).
 *
 * @param {object} props
 * @param {object|null} props.review  GET /quizzes/test-review/:courseId data, or the
 *   result's `courseReview`; renders nothing when null.
 */
export default function CourseTestReviewCard({ review, className = "" }) {
    if (!review) return null;

    if (!review.isComplete) {
        const done = Math.min(review.completed, review.total);
        return (
            <section className={`rounded-xl border border-border bg-card px-4 py-3.5 text-left sm:px-5 ${className}`}>
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Lock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    Complete all {review.total} tests to unlock your full review
                </p>
                <div className="mt-2.5 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                        <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${review.total ? (done / review.total) * 100 : 0}%` }}
                        />
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {done}/{review.total} done
                    </span>
                </div>
            </section>
        );
    }

    const sections = review.sections || [];
    const areas = review.weakAreas || [];
    const recommendations = review.recommendations || [];

    return (
        <section
            aria-labelledby="test-review-title"
            className={`rounded-xl border border-primary/30 bg-card px-4 py-4 text-left sm:px-6 sm:py-5 ${className}`}
        >
            <h2 id="test-review-title" className="flex items-center gap-2 font-display text-base font-semibold text-foreground sm:text-lg">
                <ClipboardCheck className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                Your Test Series review
            </h2>

            <ul className="mt-3 flex flex-wrap gap-2">
                {sections.map((section) => (
                    <li
                        key={section.moduleId}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold tabular-nums sm:text-sm ${
                            section.weak
                                ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        }`}
                    >
                        {section.label}: {section.percentage}% overall{section.weak ? " · weak" : ""}
                    </li>
                ))}
            </ul>

            {areas.length > 0 && (
                <div className="mt-4">
                    <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Target className="h-4 w-4 shrink-0 text-rose-500" aria-hidden />
                        Your weakest areas across all tests:
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-foreground">
                        {areas.map((area) => (
                            <li key={`${area.section}|${area.subject}|${area.topic}`} className="flex gap-2">
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
            )}

            <div className="mt-4 space-y-3 border-t border-border pt-4">
                {recommendations.map((rec) => (
                    <div key={rec.moduleId} className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <p className="text-sm text-foreground">
                            {rec.reason === "WEAK" ? (
                                <>
                                    Strengthen {rec.label} with our <span className="font-semibold">{rec.course || `${rec.label} course`}</span>:
                                    video lessons, practice quizzes and mock tests for every topic above, designed to
                                    help you score high.
                                </>
                            ) : (
                                <>
                                    You cleared both sections. To push your score higher, our{" "}
                                    <span className="font-semibold">{rec.course || `${rec.label} course`}</span> has video
                                    lessons, practice quizzes and mock tests designed to help you score high.
                                </>
                            )}
                        </p>
                        {review.purchaseUrl && (
                            <a
                                href={review.purchaseUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-orange-600"
                            >
                                Get the {rec.label} course
                                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                            </a>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}

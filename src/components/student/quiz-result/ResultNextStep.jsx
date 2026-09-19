"use client";

import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";

import useNextAction from "@/hooks/queries/student/useNextAction";
import { ICON_CLASSES, TONE_CLASSES, actionHref, styleFor } from "@/lib/nextAction";

/**
 * "What to do next" on the quiz result page.
 *
 * The whole decision — which action, its wording, whether a retry is even
 * available — comes from the backend's existing next-action service, asked in
 * the context of the quiz just submitted (`quizId`). This component renders
 * that answer and nothing else:
 *
 *   - it does not work out whether the student passed;
 *   - it does not work out whether a retake is allowed (the server's
 *     `canRetake`, enforced by the same allowance submit enforces);
 *   - it does not decide anything about a qualifying test — those stay with
 *     the qualification rules, which point a failed student at the lesson
 *     with the retry demoted to a secondary offer.
 *
 * It renders nothing at all while loading or when the server has no action,
 * so it can never occupy space with a placeholder above the result itself.
 */
export default function ResultNextStep({ courseId, quizId, returnTo = null }) {
    const { data, isLoading } = useNextAction(courseId, { quizId });

    const primary = data?.primary ?? null;
    const secondary = data?.secondary ?? [];

    if (isLoading || !primary) return null;

    const style = styleFor(primary.action);
    const Icon = style.icon;
    // A retake launched from here comes back here, matching the page's own
    // retake link rather than dropping the student somewhere else.
    const linkOptions = { from: returnTo };
    const href = actionHref(primary, linkOptions);

    return (
        <section aria-labelledby="next-step-title" className="space-y-3">
            <h2 id="next-step-title" className="text-base font-semibold text-foreground sm:text-lg">
                What to do next
            </h2>

            <div className={`rounded-2xl border p-3.5 sm:p-5 ${TONE_CLASSES[style.tone]}`}>
                <div className="flex items-start gap-3 sm:gap-4">
                    <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full sm:h-10 sm:w-10 ${ICON_CLASSES[style.tone]}`}
                    >
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
                    </div>

                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground sm:text-[11px]">
                            {primary.headline}
                        </p>

                        {primary.title && (
                            <h3 className="mt-0.5 break-words text-sm font-bold leading-snug text-foreground sm:text-lg">
                                {primary.title}
                            </h3>
                        )}

                        {/* "Why this is recommended" — the server's own
                            student-facing reason, verbatim. Never a score, a
                            mastery value, a misconception id or a database id:
                            the service does not put those in `reason`, and
                            this does not go looking for them elsewhere. */}
                        {primary.reason && (
                            <div className="mt-2 flex items-start gap-1.5 rounded-xl bg-background/50 px-2.5 py-2 sm:px-3">
                                <Info
                                    size={13}
                                    className="mt-0.5 shrink-0 text-muted-foreground"
                                    aria-hidden
                                />
                                <p className="min-w-0 break-words text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
                                    <span className="font-semibold text-foreground">
                                        Why this is recommended:{" "}
                                    </span>
                                    {primary.reason}
                                </p>
                            </div>
                        )}

                        {/* Full width on a phone so it stays an easy tap
                            target, inline from sm up. */}
                        {href && primary.cta && (
                            <Link
                                href={href}
                                className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 sm:w-auto"
                            >
                                {primary.cta}
                                <ArrowRight size={15} className="shrink-0" aria-hidden />
                            </Link>
                        )}
                    </div>
                </div>

                {/* Secondary offers — quieter than the primary and never
                    competing with it. On a failed qualifying test this is
                    where the retry lives, exactly as the server ranked it. */}
                {secondary.length > 0 && (
                    <ul className="mt-3 flex flex-col gap-1 border-t border-border/60 pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
                        {secondary.map((offer) => {
                            const offerHref = actionHref(offer, linkOptions);
                            if (!offerHref || !offer.cta) return null;
                            return (
                                <li key={`${offer.action}:${offer.title}`}>
                                    <Link
                                        href={offerHref}
                                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground sm:min-h-0 sm:py-1.5"
                                        title={offer.reason}
                                    >
                                        {offer.cta}
                                        <ArrowRight size={12} className="shrink-0" aria-hidden />
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </section>
    );
}

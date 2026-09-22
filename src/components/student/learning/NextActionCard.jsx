"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import useNextAction from "@/hooks/queries/student/useNextAction";
import { ICON_CLASSES, TONE_CLASSES, actionHref, styleFor } from "@/lib/nextAction";

/**
 * "What should I do next?" — one dominant answer, with secondary offers below.
 *
 * The action, its wording and whether a retry is even available are all the
 * server's, chosen by a fixed priority table over the existing learning path,
 * decision engine and qualification rules. This component renders that answer;
 * it never computes one, and in particular never works out retake eligibility.
 *
 * The icon/tone mapping and link building live in @/lib/nextAction, shared
 * with the quiz result page's next-step block so one action looks the same
 * wherever it is shown.
 */

export default function NextActionCard({ courseId, compact = false }) {
    const { data, isLoading } = useNextAction(courseId);

    const primary = data?.primary ?? null;
    const secondary = data?.secondary ?? [];

    if (isLoading) {
        return (
            <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-[11px] text-muted-foreground">Working out your next step…</p>
            </div>
        );
    }

    if (!primary) return null;

    const style = styleFor(primary.action);
    const Icon = style.icon;
    const href = actionHref(primary);

    return (
        <div className={`rounded-2xl border p-4 sm:p-5 ${TONE_CLASSES[style.tone]}`}>
            <div className="flex items-start gap-3">
                <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${ICON_CLASSES[style.tone]}`}
                >
                    <Icon className="h-5 w-5" aria-hidden />
                </div>

                <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground sm:text-[11px]">
                        {primary.headline}
                    </p>

                    {primary.title && (
                        <h3 className="mt-0.5 break-words text-base font-bold leading-snug text-foreground sm:text-lg">
                            {primary.title}
                        </h3>
                    )}

                    {/* The student-friendly "why". Always present, never an
                        internal score or identifier. */}
                    <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground sm:text-sm">
                        {primary.reason}
                    </p>

                    {/* The dominant control: full width on a phone so it stays
                        an easy tap target, inline from sm up. */}
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

            {/* Secondary offers — deliberately quieter than the primary, and
                omitted entirely in compact placements. */}
            {!compact && secondary.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1.5 border-t border-border/60 pt-3 sm:flex-row sm:flex-wrap sm:items-center">
                    {secondary.map((offer) => {
                        const offerHref = actionHref(offer);
                        if (!offerHref) return null;
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
    );
}

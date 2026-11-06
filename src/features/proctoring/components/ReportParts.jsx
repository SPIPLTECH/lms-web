"use client";

import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ImageOff } from "lucide-react";

import Modal from "@/components/ui/Modal";
import EvidenceThumbnail from "@/features/proctoring/components/EvidenceThumbnail";

/**
 * The parts of a proctored exam's report that the student's Exam Ended page and the staff review
 * page share, so the two read as one design: panels, pills, the score ring, the warning cards and
 * the photo viewer that steps through them.
 */

const time = (value) => (value ? new Date(value).toLocaleTimeString() : "");

export const Pill = ({ tone, children }) => <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${tone}`}>{children}</span>;
export const AMBER_PILL = "border-amber-500/30 bg-amber-500/15 text-amber-800 dark:text-amber-300";
export const ROSE_PILL = "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300";
export const GREEN_PILL = "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";

export function Panel({ title, aside = null, children, className = "" }) {
    return (
        <section className={`flex flex-col gap-3 rounded-xl border border-border bg-background/60 p-4 ${className}`}>
            <h3 className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {title}
                {aside}
            </h3>
            {children}
        </section>
    );
}

/** The percentage as a ring, with a dot where the pass mark sits. */
export function ScoreRing({ percentage, passingScore, passed }) {
    const size = 96;
    const radius = size / 2 - 9;
    const circumference = 2 * Math.PI * radius;
    const value = Math.max(0, Math.min(100, Number(percentage) || 0));
    const passAngle = ((Number(passingScore) || 0) / 100) * 2 * Math.PI;
    return (
        <div className="relative shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90" aria-hidden>
                <circle cx={size / 2} cy={size / 2} r={radius} className="stroke-muted" strokeWidth="9" fill="none" />
                <circle cx={size / 2} cy={size / 2} r={radius} className={passed ? "stroke-emerald-500" : "stroke-rose-400"} strokeWidth="9" fill="none" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - value / 100)} />
                {passingScore != null && <circle cx={size / 2 + radius * Math.cos(passAngle)} cy={size / 2 + radius * Math.sin(passAngle)} r="5" className="fill-amber-400 stroke-card" strokeWidth="2.5" />}
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xl font-extrabold text-foreground">{percentage ?? "-"}%</span>
        </div>
    );
}

/**
 * Only the moments that counted, with their photos. Everything else is one line, folded away.
 * A card's `note` (staff only) is the line a reviewer needs; the student's cards have none.
 */
export function WarningsPanel({ featured, others, endingEvent, maxWarnings, onOpen, onLoaded }) {
    const [showOthers, setShowOthers] = useState(false);
    return (
        <div className="flex flex-col gap-3">
            {featured.length > 0 ? (
                <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {featured.map((violation, index) => (
                        <li key={violation.id} className="flex flex-col overflow-hidden rounded-xl border border-border bg-background/60 transition hover:-translate-y-0.5 hover:border-amber-500/40 hover:shadow-lg">
                            {violation.evidenceId ? (
                                <EvidenceThumbnail
                                    evidenceId={violation.evidenceId}
                                    explanation={violation.explanation}
                                    capturedAt={violation.evidenceCapturedAt}
                                    sizeClassName="aspect-video w-full !rounded-none !border-0"
                                    onOpen={() => onOpen(index)}
                                    onLoaded={onLoaded}
                                />
                            ) : (
                                <span className="flex aspect-video w-full flex-col items-center justify-center gap-1 bg-muted text-xs text-muted-foreground">
                                    <ImageOff className="h-5 w-5" aria-hidden />
                                    No photo
                                </span>
                            )}
                            <div className={`flex flex-1 flex-col gap-1.5 border-t-[3px] p-3 ${violation.warningNumber ? "border-amber-400" : "border-border"}`}>
                                <div className="flex items-center gap-2">
                                    {violation.warningNumber ? (
                                        <>
                                            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/15 text-[11px] font-extrabold text-amber-700 dark:text-amber-300">{violation.warningNumber}</span>
                                            <span className="text-sm font-bold text-amber-700 dark:text-amber-300">Warning {violation.warningNumber} of {maxWarnings}</span>
                                        </>
                                    ) : (
                                        <span className="text-sm font-bold text-muted-foreground">Recorded</span>
                                    )}
                                    <span className="ml-auto font-mono text-xs text-muted-foreground">{time(violation.timestamp)}</span>
                                </div>
                                <p className="text-sm font-semibold leading-snug text-foreground">{violation.explanation}</p>
                                {violation.note && <p className="text-xs leading-snug text-muted-foreground">{violation.note}</p>}
                            </div>
                        </li>
                    ))}
                </ol>
            ) : (
                <p className="rounded-xl border border-border bg-background/60 p-4 text-sm text-muted-foreground">No warnings were issued during this exam.</p>
            )}

            {endingEvent && (
                <p className="flex flex-wrap items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-sm">
                    <span className="h-4 w-4 shrink-0 rounded bg-rose-600" aria-hidden />
                    <span className="font-mono text-xs text-muted-foreground">{time(endingEvent.timestamp)}</span>
                    <span className="font-semibold text-rose-700 dark:text-rose-300">{endingEvent.explanation}</span>
                </p>
            )}

            {others.length > 0 && (
                <div className="flex flex-col gap-2">
                    <button type="button" aria-expanded={showOthers} onClick={() => setShowOthers((value) => !value)} className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-primary underline-offset-2 hover:underline">
                        {others.length} other {others.length === 1 ? "event was" : "events were"} recorded but did not count as warnings · {showOthers ? "Hide" : "Show"}
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showOthers ? "rotate-180" : ""}`} aria-hidden />
                    </button>
                    {showOthers && (
                        <ul className="flex flex-col gap-1.5">
                            {others.map((violation) => (
                                <li key={violation.id} className="flex gap-3 text-xs text-muted-foreground">
                                    <span className="shrink-0 font-mono">{time(violation.timestamp)}</span>
                                    {violation.explanation}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}

/** The warning photos, one at a time, with arrows between them. `title` names the open one. */
export function PhotoViewer({ items, index, onIndexChange, onClose, photoUrls, title }) {
    const open = index === null ? null : items[index];
    const url = open?.evidenceId ? photoUrls[open.evidenceId] : null;
    return (
        <Modal open={Boolean(open)} onClose={onClose} title={open ? title(open) : ""} size="lg">
            {open && (
                <div className="flex flex-col gap-3">
                    <div className="relative overflow-hidden rounded-lg bg-black">
                        {url ? (
                            // A blob of a private image: next/image cannot optimise it, and must not try to.
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={url} alt="" className="mx-auto max-h-[60dvh] w-auto max-w-full" />
                        ) : (
                            <span className="flex h-64 flex-col items-center justify-center gap-2 text-sm text-white/70">
                                <ImageOff className="h-6 w-6" aria-hidden /> Photo unavailable
                            </span>
                        )}
                        {items.length > 1 && (
                            <>
                                <button type="button" onClick={() => onIndexChange(Math.max(0, index - 1))} disabled={index === 0} aria-label="Previous photo" className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-md disabled:opacity-30">
                                    <ChevronLeft className="h-5 w-5" aria-hidden />
                                </button>
                                <button type="button" onClick={() => onIndexChange(Math.min(items.length - 1, index + 1))} disabled={index === items.length - 1} aria-label="Next photo" className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-md disabled:opacity-30">
                                    <ChevronRight className="h-5 w-5" aria-hidden />
                                </button>
                            </>
                        )}
                    </div>
                    <p className="text-sm font-semibold text-foreground">{open.explanation}</p>
                    {open.note && <p className="-mt-2 text-xs text-muted-foreground">{open.note}</p>}
                </div>
            )}
        </Modal>
    );
}

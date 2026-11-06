"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Flag, Images, MicOff, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";

import Loader from "@/components/common/Loader";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import EvidenceThumbnail from "@/features/proctoring/components/EvidenceThumbnail";
import { AMBER_PILL, GREEN_PILL, Panel, PhotoViewer, Pill, ROSE_PILL, ScoreRing, WarningsPanel } from "@/features/proctoring/components/ReportParts";
import { useDecideProctoringReview, useDeleteAttemptEvidence, useProctoringReview } from "@/hooks/queries/instructor/useProctoringReviews";
import { DECISION_DONE, DECISION_OPTIONS, TERMINATION_RULE_LABELS, analysisLine, eventLabel, eventNote, flagReasonLabel, needsDecisionNote, reviewOutcome, reviewWarnings } from "@/lib/proctoring/reviewLabels";

const when = (value) => (value ? new Date(value).toLocaleString() : "-");
const clock = (value) => (value ? new Date(value).toLocaleTimeString() : "");
const minutesBetween = (from, to) => (from && to ? Math.max(1, Math.round((new Date(to) - new Date(from)) / 60000)) : null);

const CATEGORY_LABELS = { VIOLATION: "Around an event", UNANALYSED: "Not analysed", PERIODIC: "Routine", IDENTITY: "Identity photo" };

/** The look of each outcome, so they cannot be mistaken for one another. */
const OUTCOME_LOOK = {
    PROCTORING: { icon: ShieldAlert, box: "border-rose-500/30 bg-rose-500/10", accent: "text-rose-700 dark:text-rose-300" },
    FLAGGED: { icon: Flag, box: "border-amber-500/30 bg-amber-500/10", accent: "text-amber-800 dark:text-amber-300" },
    CLEAR: { icon: ShieldCheck, box: "border-border bg-card", accent: "text-foreground" },
};

function Fact({ label, children }) {
    return (
        <div className="min-w-0">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
            <dd className="text-xs font-semibold leading-snug text-foreground">{children}</dd>
        </div>
    );
}

function DecisionForm({ attemptId, allowed }) {
    const decide = useDecideProctoringReview(attemptId);
    const [decision, setDecision] = useState(null);
    const [note, setNote] = useState("");

    const noteNeeded = decision ? needsDecisionNote(decision) : false;
    const noteOk = !noteNeeded || note.trim().length >= 5;

    return (
        <form
            className="flex flex-col gap-2"
            onSubmit={(event) => {
                event.preventDefault();
                if (decision && noteOk) decide.mutate({ decision, note: note.trim() || undefined });
            }}
        >
            <fieldset className="flex flex-col gap-1.5">
                <legend className="sr-only">Your decision</legend>
                {allowed.map((option) => (
                    <label key={option} className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2 text-sm ${decision === option ? "border-primary bg-primary/5" : "border-border"}`}>
                        <input type="radio" name="decision" value={option} checked={decision === option} onChange={() => setDecision(option)} className="mt-0.5" />
                        <span>
                            <span className="font-semibold text-foreground">{DECISION_OPTIONS[option].label}</span>
                            <span className="block text-xs text-muted-foreground">{DECISION_OPTIONS[option].help}</span>
                        </span>
                    </label>
                ))}
            </fieldset>
            <label className="flex flex-col gap-1 text-xs font-medium text-foreground">
                {noteNeeded ? "Your reason (the student will see this)" : "Note (optional; the student will see this)"}
                <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} maxLength={2000} className="rounded-lg border border-border bg-background p-2 text-sm font-normal text-foreground outline-none focus:border-primary/50" />
            </label>
            {decide.isError && (
                <p role="alert" className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
                    {decide.error?.response?.data?.message || "The decision could not be saved. Please try again."}
                </p>
            )}
            <Button type="submit" disabled={!decision || !noteOk || decide.isPending} loading={decide.isPending}>
                Save decision
            </Button>
        </form>
    );
}

function DeleteEvidence({ attemptId, count }) {
    const remove = useDeleteAttemptEvidence(attemptId);
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState("");
    if (count === 0) return null;
    return (
        <>
            <Button type="button" variant="outline" onClick={() => setOpen(true)} className="inline-flex w-fit items-center justify-center gap-1.5">
                <Trash2 className="h-4 w-4" aria-hidden /> Delete this attempt&apos;s images
            </Button>
            <Modal open={open} onClose={() => setOpen(false)} title="Delete these images?" size="sm">
                <form
                    className="flex flex-col gap-3"
                    onSubmit={(event) => {
                        event.preventDefault();
                        remove.mutate(reason.trim(), { onSuccess: () => setOpen(false) });
                    }}
                >
                    <p className="text-sm text-muted-foreground">
                        This removes {count} {count === 1 ? "image" : "images"} for good. The record of the attempt, its score and its timeline stay. The deletion and your reason are logged.
                    </p>
                    <label className="flex flex-col gap-1 text-xs font-medium text-foreground">
                        Reason
                        <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={2} maxLength={500} className="rounded-lg border border-border bg-background p-2 text-sm font-normal text-foreground outline-none focus:border-primary/50" />
                    </label>
                    {remove.isError && <p role="alert" className="text-xs text-rose-600">{remove.error?.response?.data?.message || "The images could not be deleted."}</p>}
                    <Button type="submit" variant="danger" disabled={reason.trim().length < 5 || remove.isPending} loading={remove.isPending}>
                        Delete images
                    </Button>
                </form>
            </Modal>
        </>
    );
}

const ViewingLogged = () => (
    <p className="flex items-center gap-1 py-2 text-[11px] text-muted-foreground">
        <Images className="h-3 w-3" aria-hidden /> Viewing an image is logged against your account.
    </p>
);

function OverviewPanel({ review, terminated, onShowWarnings, warningsTabLabel, featuredCount }) {
    const { attempt, quiz, score, consent, risk } = review;
    const maxWarnings = attempt.maxWarnings ?? 3;
    const passed = Boolean(score?.passed) && !terminated;
    return (
        <div className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-3">
                <Panel title="Score" aside={score ? <Pill tone={passed ? GREEN_PILL : ROSE_PILL}>{passed ? "Passed" : "Not passed"}</Pill> : null}>
                    {score ? (
                        <div className="flex items-center gap-4">
                            <ScoreRing percentage={score.percentage} passingScore={quiz.passingScore} passed={passed} />
                            <div>
                                <p className="text-3xl font-extrabold leading-none text-foreground">
                                    {score.score}
                                    <span className="text-base font-semibold text-muted-foreground"> / {score.totalMarks}</span>
                                </p>
                                <p className="mt-1.5 text-xs text-muted-foreground">Pass mark {quiz.passingScore}%</p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No score was recorded for this attempt.</p>
                    )}
                </Panel>
                <Panel title="Warnings" aside={attempt.warningCount >= maxWarnings ? <Pill tone={AMBER_PILL}>Limit reached</Pill> : null}>
                    <p className="text-3xl font-extrabold leading-none text-foreground">
                        {attempt.warningCount}
                        <span className="text-base font-semibold text-muted-foreground"> / {maxWarnings}</span>
                    </p>
                    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${maxWarnings}, minmax(0, 1fr))` }} aria-hidden>
                        {Array.from({ length: maxWarnings }, (_, index) => (
                            <span key={index} className={`h-3 rounded ${index < attempt.warningCount ? "bg-amber-400" : "bg-muted"}`} />
                        ))}
                    </div>
                    {onShowWarnings ? (
                        <button type="button" onClick={onShowWarnings} className="w-fit text-xs font-semibold text-primary underline underline-offset-2">
                            See {featuredCount === 1 ? "the photo" : `the ${featuredCount} photos`} in {warningsTabLabel.toLowerCase()}
                        </button>
                    ) : (
                        <p className="text-xs text-muted-foreground">No warnings during this exam.</p>
                    )}
                </Panel>
                <Panel title="Monitoring">
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
                        <Fact label="Photos sent / checked">{attempt.framesReceived} / {attempt.framesAnalysed}</Fact>
                        <Fact label="Longest gap">{attempt.longestGapSeconds != null ? `${attempt.longestGapSeconds}s` : "-"}</Fact>
                        <Fact label="Identity check">{attempt.identityNotes ?? attempt.identityCheck ?? "-"}</Fact>
                        <Fact label="Identity matching">{attempt.identityMatching ? "On" : "Off"}</Fact>
                    </dl>
                </Panel>
            </div>
            <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr]">
                <Panel title="Why it is here">
                    {terminated && <p className="text-sm font-medium text-rose-700 dark:text-rose-300">{TERMINATION_RULE_LABELS[attempt.terminationRule] ?? attempt.terminationReason}</p>}
                    {attempt.flags.length > 0 ? (
                        <ul className="list-disc space-y-0.5 pl-4 text-sm text-foreground">
                            {attempt.flags.map((flag) => (
                                <li key={flag.reason}>
                                    {flagReasonLabel(flag.reason)} <span className="text-[11px] text-muted-foreground">at {clock(flag.at)}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        !terminated && <p className="text-sm text-muted-foreground">Nothing was flagged.</p>
                    )}
                    <p className="text-[11px] text-muted-foreground">{risk.summary}</p>
                </Panel>
                <Panel title="The attempt">
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
                        <Fact label="Started">{when(attempt.startedAt)}</Fact>
                        <Fact label="Ended">{when(attempt.endedAt)}</Fact>
                        <Fact label="Violations recorded">{attempt.violationCount ?? review.events.length}</Fact>
                        <Fact label="Consent">{consent ? `${consent.wordingVersion}, ${when(consent.acceptedAt)}` : "-"}</Fact>
                    </dl>
                </Panel>
            </div>
        </div>
    );
}

function TimelinePanel({ events, evidenceByFrame, onPreview }) {
    if (events.length === 0) return <p className="rounded-xl border border-border bg-background/60 p-4 text-sm text-muted-foreground">Nothing was recorded.</p>;
    return (
        <ol className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {events.map((event) => {
                const frame = (event.metadata?.evidenceIds ?? []).map((id) => evidenceByFrame.get(id)).find(Boolean);
                const ending = event.eventType === "AUTO_TERMINATION_ENFORCED";
                const note = eventNote(event);
                return (
                    <li key={event.id} className={`flex items-center justify-between gap-3 p-2.5 ${ending ? "bg-rose-500/10" : event.warningIssued ? "bg-amber-500/10" : ""}`}>
                        <div className="flex min-w-0 items-start gap-3">
                            <span className="shrink-0 whitespace-nowrap pt-0.5 font-mono text-[11px] text-muted-foreground">{clock(event.timestamp)}</span>
                            <div className="min-w-0">
                                <p className={`flex flex-wrap items-center gap-1.5 text-xs font-semibold ${ending ? "text-rose-700 dark:text-rose-300" : "text-foreground"}`}>
                                    {eventLabel(event.eventType)}
                                    {event.eventType === "ATTEMPT_FLAGGED" && event.metadata?.reason ? `: ${flagReasonLabel(event.metadata.reason)}` : ""}
                                    {event.warningIssued && <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300">Warned</span>}
                                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">{event.severity}</span>
                                </p>
                                {note && <p className="text-[11px] text-muted-foreground">{note}</p>}
                            </div>
                        </div>
                        {frame && <EvidenceThumbnail evidenceId={frame.id} explanation={eventLabel(event.eventType)} capturedAt={frame.receivedAt} onOpen={onPreview} />}
                    </li>
                );
            })}
        </ol>
    );
}

function PhotosPanel({ evidence, onPreview }) {
    if (evidence.length === 0) return <p className="rounded-xl border border-border bg-background/60 p-4 text-sm text-muted-foreground">No images are held for this attempt. They may have passed their retention date.</p>;
    return (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
            {evidence.map((row) => (
                <li key={row.id} className="flex flex-col gap-1 rounded-lg border border-border bg-background/60 p-1.5">
                    <EvidenceThumbnail sizeClassName="aspect-[4/3] w-full" evidenceId={row.id} explanation={analysisLine(row.analysis)} capturedAt={row.receivedAt} onOpen={onPreview} />
                    <p className="text-[10px] font-bold text-foreground">
                        {CATEGORY_LABELS[row.category] ?? row.category} · {clock(row.receivedAt)}
                        {row.late ? " · late" : ""}
                    </p>
                    <p className="text-[10px] leading-snug text-muted-foreground">{analysisLine(row.analysis)}</p>
                </li>
            ))}
        </ul>
    );
}

function DecisionAside({ attemptId, attempt, appeals, allowedDecisions }) {
    const openAppeal = appeals.find((appeal) => !appeal.decidedAt);
    return (
        <aside className="flex flex-col gap-3 border-t border-border p-4 lg:min-h-0 lg:overflow-y-auto lg:border-l lg:border-t-0">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{attempt.reviewState === "PENDING" ? "Your decision" : "Decision"}</h2>
            {openAppeal && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-sm">
                    <p className="font-semibold text-amber-800 dark:text-amber-300">The student has asked for this to be reviewed again</p>
                    <p className="mt-1 whitespace-pre-line text-foreground">{openAppeal.reason}</p>
                </div>
            )}
            {attempt.decision && (
                <p className="rounded-lg border border-border bg-background/60 p-2.5 text-sm text-foreground">
                    <span className="font-semibold">{DECISION_DONE[attempt.decision]}</span> on {when(attempt.decidedAt)}
                    {attempt.decisionNote && <span className="mt-1 block whitespace-pre-line text-muted-foreground">{attempt.decisionNote}</span>}
                </p>
            )}
            {allowedDecisions.length > 0 ? <DecisionForm attemptId={attemptId} allowed={allowedDecisions} /> : !attempt.decision && <p className="text-sm text-muted-foreground">This attempt does not need a decision.</p>}
            <p className="text-[11px] text-muted-foreground">Automated signals can be wrong. Please look at the photos and the timeline before deciding.</p>
        </aside>
    );
}

/**
 * One attempt, for the instructor or an admin, laid out like the student's Exam Ended report: an
 * outcome banner, then Overview, the warnings with their photos, the timeline and every photo on
 * their own tabs, with the decision beside them. It fits a laptop screen; on a small screen it is an
 * ordinary page.
 */
export default function ReviewDetail({ attemptId, listPath, canDeleteEvidence = false }) {
    const { data: review, isLoading, isError, error } = useProctoringReview(attemptId);
    const [tab, setTab] = useState(null);
    const [preview, setPreview] = useState(null);
    const [zoom, setZoom] = useState(null);
    const [photoUrls, setPhotoUrls] = useState({});
    const rememberPhoto = useCallback((evidenceId, url) => setPhotoUrls((current) => ({ ...current, [evidenceId]: url })), []);

    const evidenceByFrame = useMemo(() => new Map((review?.evidence ?? []).map((row) => [row.frameId, row])), [review]);
    const terminated = review?.attempt.status === "TERMINATED";
    const warnings = useMemo(() => (review ? reviewWarnings(review.events, review.evidence, { terminated }) : null), [review, terminated]);

    if (isLoading) return <Loader />;
    if (isError || !review) {
        return (
            <p role="alert" className="m-4 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
                {error?.response?.data?.message || "This attempt could not be loaded."}
            </p>
        );
    }

    const { attempt, student, quiz, events, evidence, appeals, allowedDecisions } = review;
    const outcome = reviewOutcome(attempt);
    const look = OUTCOME_LOOK[outcome.kind];
    const OutcomeIcon = look.icon;
    const maxWarnings = attempt.maxWarnings ?? 3;
    const openAppeal = appeals.some((appeal) => !appeal.decidedAt);
    const minutes = minutesBetween(attempt.startedAt, attempt.endedAt);

    const showWarningsTab = warnings.featured.length > 0 || terminated;
    const warningsTabLabel = terminated ? "Why it ended" : "Warnings";
    const tabs = [
        { id: "overview", label: "Overview" },
        ...(showWarningsTab ? [{ id: "warnings", label: warningsTabLabel, count: warnings.featured.length }] : []),
        { id: "timeline", label: "Timeline", count: events.length },
        { id: "photos", label: "All photos", count: evidence.length },
    ];
    // The warnings are what a reviewer has come for, so they open first when there are any.
    const activeTab = tabs.some((item) => item.id === tab) ? tab : showWarningsTab ? "warnings" : "overview";

    return (
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-2 p-2 sm:p-4 lg:h-full lg:min-h-0">
            <Link href={listPath} className="inline-flex w-fit shrink-0 items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary">
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> All proctored exams
            </Link>

            <div className="flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-card lg:min-h-0 lg:flex-1">
                <header className={`flex shrink-0 flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 ${look.box}`}>
                    <div className="flex min-w-0 items-start gap-3">
                        <OutcomeIcon className={`mt-0.5 h-7 w-7 shrink-0 ${look.accent}`} aria-hidden />
                        <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className={`text-xl font-bold leading-tight ${look.accent}`}>{outcome.title}</h1>
                                {attempt.reviewState === "PENDING" && <Pill tone={AMBER_PILL}>{openAppeal ? "Student asked for another look" : "Awaiting your decision"}</Pill>}
                                {attempt.decision && <Pill tone={GREEN_PILL}>Decided · {DECISION_DONE[attempt.decision]}</Pill>}
                                {attempt.microphoneStatus === "REFUSED" && (
                                    <Pill tone="border-border bg-background/60 text-muted-foreground">
                                        <MicOff className="h-3 w-3" aria-hidden /> Microphone refused
                                    </Pill>
                                )}
                            </div>
                            {outcome.detail && <p className={`text-sm font-medium ${look.accent}`}>{outcome.detail}</p>}
                            <p className="text-xs text-muted-foreground">
                                {quiz.title}
                                {quiz.courseTitle ? ` · ${quiz.courseTitle}` : ""}
                                {attempt.startedAt ? ` · ${clock(attempt.startedAt)} – ${clock(attempt.endedAt)}, ${new Date(attempt.startedAt).toLocaleDateString()}` : ""}
                                {minutes ? ` (${minutes} min)` : ""}
                            </p>
                        </div>
                    </div>
                    <div className="shrink-0 sm:max-w-xs sm:text-right">
                        <span className="block text-sm font-bold text-foreground">{student?.name ?? "Account removed"}</span>
                        {student?.email && <span className="block text-xs text-muted-foreground">{student.email}</span>}
                    </div>
                </header>

                <div className="flex flex-col lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="flex min-w-0 flex-col lg:min-h-0">
                        <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 border-b border-border px-2 sm:px-4">
                            <div role="tablist" aria-label="Attempt details" className="flex min-w-0 flex-wrap gap-1">
                                {tabs.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        role="tab"
                                        id={`review-tab-${item.id}`}
                                        aria-selected={activeTab === item.id}
                                        aria-controls={`review-panel-${item.id}`}
                                        onClick={() => setTab(item.id)}
                                        className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${activeTab === item.id ? "border-emerald-500 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                                    >
                                        {item.label}
                                        {item.count !== undefined && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{item.count}</span>}
                                    </button>
                                ))}
                            </div>
                            <ViewingLogged />
                        </div>

                        <div className="p-3 sm:p-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
                            <div role="tabpanel" id="review-panel-overview" aria-labelledby="review-tab-overview" hidden={activeTab !== "overview"}>
                                <OverviewPanel review={review} terminated={terminated} warningsTabLabel={warningsTabLabel} featuredCount={warnings.featured.length} onShowWarnings={showWarningsTab && warnings.featured.length > 0 ? () => setTab("warnings") : null} />
                            </div>
                            {/* Stays mounted, so switching tabs does not fetch the photos again. */}
                            {showWarningsTab && (
                                <div role="tabpanel" id="review-panel-warnings" aria-labelledby="review-tab-warnings" hidden={activeTab !== "warnings"}>
                                    <WarningsPanel featured={warnings.featured} others={warnings.others} endingEvent={warnings.endingEvent} maxWarnings={maxWarnings} onOpen={setZoom} onLoaded={rememberPhoto} />
                                </div>
                            )}
                            <div role="tabpanel" id="review-panel-timeline" aria-labelledby="review-tab-timeline" hidden={activeTab !== "timeline"}>
                                {activeTab === "timeline" && <TimelinePanel events={events} evidenceByFrame={evidenceByFrame} onPreview={setPreview} />}
                            </div>
                            <div role="tabpanel" id="review-panel-photos" aria-labelledby="review-tab-photos" hidden={activeTab !== "photos"} className="flex flex-col gap-3">
                                {activeTab === "photos" && (
                                    <>
                                        <PhotosPanel evidence={evidence} onPreview={setPreview} />
                                        {canDeleteEvidence && attempt.reviewState !== "PENDING" && <DeleteEvidence attemptId={attemptId} count={evidence.length} />}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <DecisionAside attemptId={attemptId} attempt={attempt} appeals={appeals} allowedDecisions={allowedDecisions} />
                </div>
            </div>

            <PhotoViewer
                items={warnings.featured}
                index={zoom}
                onIndexChange={setZoom}
                onClose={() => setZoom(null)}
                photoUrls={photoUrls}
                title={(photo) => `${photo.warningNumber ? `Warning ${photo.warningNumber} of ${maxWarnings}` : "Recorded"} · ${clock(photo.timestamp)}`}
            />
            <Modal open={Boolean(preview)} onClose={() => setPreview(null)} title="Exam photo" size="lg">
                {preview && (
                    <div className="flex flex-col gap-2">
                        {/* A blob of a private image: next/image cannot optimise it, and must not try to. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={preview.url} alt="" className="mx-auto max-h-[65vh] w-auto max-w-full rounded-lg" />
                        <p className="text-xs text-muted-foreground">
                            {preview.explanation}
                            {preview.capturedAt ? ` · ${clock(preview.capturedAt)}` : ""}
                        </p>
                    </div>
                )}
            </Modal>
        </div>
    );
}

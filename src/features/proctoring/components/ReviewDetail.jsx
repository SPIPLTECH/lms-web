"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Gavel, Images, MicOff, ScrollText, ShieldAlert, ShieldCheck, Trash2, User } from "lucide-react";

import Loader from "@/components/common/Loader";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import EvidenceThumbnail from "@/features/proctoring/components/EvidenceThumbnail";
import { useDecideProctoringReview, useDeleteAttemptEvidence, useProctoringReview } from "@/hooks/queries/instructor/useProctoringReviews";
import { DECISION_DONE, DECISION_OPTIONS, TERMINATION_RULE_LABELS, analysisLine, eventLabel, flagReasonLabel, needsDecisionNote } from "@/lib/proctoring/reviewLabels";

const when = (value) => (value ? new Date(value).toLocaleString() : "-");
const clock = (value) => (value ? new Date(value).toLocaleTimeString() : "");

const CATEGORY_LABELS = { VIOLATION: "Around an event", UNANALYSED: "Not analysed", PERIODIC: "Routine", IDENTITY: "Identity photo" };

function Section({ icon: Icon, title, children }) {
    return (
        <section className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3">
            <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground">
                <Icon className="h-3.5 w-3.5 text-primary" aria-hidden />
                {title}
            </h2>
            {children}
        </section>
    );
}

function Fact({ label, children }) {
    return (
        <div className="min-w-0 rounded-lg border border-border bg-background/60 p-2">
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
            <Button type="button" variant="outline" onClick={() => setOpen(true)} className="inline-flex items-center justify-center gap-1.5">
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

/** One attempt, for the instructor or an admin: what happened, what was kept, and the decision. */
export default function ReviewDetail({ attemptId, listPath, canDeleteEvidence = false }) {
    const { data: review, isLoading, isError, error } = useProctoringReview(attemptId);
    const [tab, setTab] = useState("timeline");
    const [preview, setPreview] = useState(null);

    const evidenceByFrame = useMemo(() => new Map((review?.evidence ?? []).map((row) => [row.frameId, row])), [review]);

    if (isLoading) return <Loader />;
    if (isError || !review) {
        return (
            <p role="alert" className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
                {error?.response?.data?.message || "This attempt could not be loaded."}
            </p>
        );
    }

    const { attempt, student, quiz, score, consent, risk, events, evidence, appeals, allowedDecisions } = review;
    const terminated = attempt.status === "TERMINATED";
    const openAppeal = appeals.find((appeal) => !appeal.decidedAt);

    return (
        <div className="flex flex-col gap-3">
            <Link href={listPath} className="inline-flex w-fit items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary">
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> All proctored exams
            </Link>

            <header className="flex flex-wrap items-start justify-between gap-2 rounded-2xl border border-border bg-card p-3">
                <div className="min-w-0">
                    <h1 className={`flex flex-wrap items-center gap-2 text-base font-bold ${terminated ? "text-rose-600 dark:text-rose-400" : "text-foreground"}`}>
                        {terminated ? <ShieldAlert className="h-4 w-4" aria-hidden /> : <ShieldCheck className="h-4 w-4" aria-hidden />}
                        {terminated ? "Ended by proctoring" : attempt.isFlagged ? "Flagged for review" : "No concerns"}
                        {attempt.microphoneStatus === "REFUSED" && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/60 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                                <MicOff className="h-3 w-3" aria-hidden /> Microphone refused
                            </span>
                        )}
                    </h1>
                    <p className="text-xs text-muted-foreground">{quiz.title} · {quiz.courseTitle}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                    <p className="flex items-center justify-end gap-1 font-semibold text-foreground"><User className="h-3.5 w-3.5" aria-hidden /> {student?.name ?? "Account removed"}</p>
                    <p>{student?.email}</p>
                </div>
            </header>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
                <div className="flex flex-col gap-3">
                    <Section icon={Gavel} title={attempt.reviewState === "PENDING" ? "Your decision" : "Decision"}>
                        {openAppeal && (
                            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-sm">
                                <p className="font-semibold text-amber-800 dark:text-amber-300">The student has asked for this to be reviewed again</p>
                                <p className="mt-1 whitespace-pre-line text-foreground">{openAppeal.reason}</p>
                            </div>
                        )}
                        {attempt.decision && (
                            <p className="text-sm text-foreground">
                                <span className="font-semibold">{DECISION_DONE[attempt.decision]}</span> on {when(attempt.decidedAt)}{attempt.decisionNote ? `: ${attempt.decisionNote}` : ""}
                            </p>
                        )}
                        {allowedDecisions.length > 0 ? <DecisionForm attemptId={attemptId} allowed={allowedDecisions} /> : !attempt.decision && <p className="text-sm text-muted-foreground">This attempt does not need a decision.</p>}
                        <p className="text-[11px] text-muted-foreground">Automated signals can be wrong. Please look at the photos and the timeline before deciding.</p>
                    </Section>

                    <Section icon={ShieldAlert} title="Why it is here">
                        {terminated && <p className="text-sm font-medium text-rose-700 dark:text-rose-300">{TERMINATION_RULE_LABELS[attempt.terminationRule] ?? attempt.terminationReason}</p>}
                        {attempt.flags.length > 0 ? (
                            <ul className="list-disc space-y-0.5 pl-4 text-sm text-foreground">
                                {attempt.flags.map((flag) => (
                                    <li key={flag.reason}>{flagReasonLabel(flag.reason)} <span className="text-[11px] text-muted-foreground">at {clock(flag.at)}</span></li>
                                ))}
                            </ul>
                        ) : (
                            !terminated && <p className="text-sm text-muted-foreground">Nothing was flagged.</p>
                        )}
                        <p className="text-[11px] text-muted-foreground">{risk.summary}</p>
                    </Section>

                    <Section icon={ScrollText} title="The attempt">
                        <dl className="grid grid-cols-2 gap-2">
                            <Fact label="Score">{score ? `${score.score} / ${score.totalMarks} (${score.percentage}%)` : "-"}</Fact>
                            <Fact label="Counts as a pass">{score?.passed ? "Yes" : "No"}</Fact>
                            <Fact label="Started">{when(attempt.startedAt)}</Fact>
                            <Fact label="Ended">{when(attempt.endedAt)}</Fact>
                            <Fact label="Identity check">{attempt.identityNotes ?? attempt.identityCheck}</Fact>
                            <Fact label="Identity matching">{attempt.identityMatching ? "On" : "Off"}</Fact>
                            <Fact label="Warnings">{attempt.warningCount}</Fact>
                            <Fact label="Longest gap">{attempt.longestGapSeconds != null ? `${attempt.longestGapSeconds}s` : "-"}</Fact>
                            <Fact label="Photos sent / checked">{attempt.framesReceived} / {attempt.framesAnalysed}</Fact>
                            <Fact label="Consent">{consent ? `${consent.wordingVersion}, ${when(consent.acceptedAt)}` : "-"}</Fact>
                        </dl>
                        {canDeleteEvidence && attempt.reviewState !== "PENDING" && <DeleteEvidence attemptId={attemptId} count={evidence.length} />}
                    </Section>
                </div>

                <section className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3">
                    <div role="tablist" aria-label="Attempt details" className="grid grid-cols-2 gap-1 rounded-lg bg-background/60 p-1">
                        {[
                            ["timeline", `Timeline (${events.length})`],
                            ["images", `Images (${evidence.length})`],
                        ].map(([id, label]) => (
                            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`rounded-md px-2 py-1.5 text-[11px] font-bold transition ${tab === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                                {label}
                            </button>
                        ))}
                    </div>

                    {tab === "timeline" ? (
                        events.length > 0 ? (
                            <ol className="max-h-[70vh] divide-y divide-border overflow-y-auto rounded-lg border border-border">
                                {events.map((event) => {
                                    const frames = (event.metadata?.evidenceIds ?? []).map((id) => evidenceByFrame.get(id)).filter(Boolean);
                                    return (
                                        <li key={event.id} className="flex items-center justify-between gap-3 p-2.5">
                                            <div className="min-w-0">
                                                <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                                                    <span className="font-mono">{clock(event.timestamp)}</span>
                                                    <span className="rounded bg-background/60 px-1.5 py-0.5 text-[10px] font-bold">{event.severity}</span>
                                                    {event.warningIssued && <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300">Warned</span>}
                                                </p>
                                                <p className="text-xs font-semibold text-foreground">{eventLabel(event.eventType)}{event.eventType === "ATTEMPT_FLAGGED" && event.metadata?.reason ? `: ${flagReasonLabel(event.metadata.reason)}` : ""}</p>
                                                {typeof event.metadata?.signalConfidence === "number" && <p className="text-[11px] text-muted-foreground">Confidence {Math.round(event.metadata.signalConfidence * 100)}%</p>}
                                            </div>
                                            {frames[0] && <EvidenceThumbnail evidenceId={frames[0].id} explanation={eventLabel(event.eventType)} capturedAt={frames[0].receivedAt} onOpen={setPreview} />}
                                        </li>
                                    );
                                })}
                            </ol>
                        ) : (
                            <p className="p-6 text-center text-xs text-muted-foreground">Nothing was recorded.</p>
                        )
                    ) : evidence.length > 0 ? (
                        <ul className="grid max-h-[70vh] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 xl:grid-cols-4">
                            {evidence.map((row) => (
                                <li key={row.id} className="flex flex-col gap-1 rounded-lg border border-border p-1.5">
                                    <EvidenceThumbnail large evidenceId={row.id} explanation={analysisLine(row.analysis)} capturedAt={row.receivedAt} onOpen={setPreview} />
                                    <p className="text-[10px] font-bold text-foreground">{CATEGORY_LABELS[row.category] ?? row.category} · {clock(row.receivedAt)}{row.late ? " · late" : ""}</p>
                                    <p className="text-[10px] leading-snug text-muted-foreground">{analysisLine(row.analysis)}</p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="p-6 text-center text-xs text-muted-foreground">No images are held for this attempt. They may have passed their retention date.</p>
                    )}
                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground"><Images className="h-3 w-3" aria-hidden /> Viewing an image is logged against your account.</p>
                </section>
            </div>

            <Modal open={Boolean(preview)} onClose={() => setPreview(null)} title="Exam photo" size="lg">
                {preview && (
                    <div className="flex flex-col gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={preview.url} alt="" className="mx-auto max-h-[65vh] w-auto max-w-full rounded-lg" />
                        <p className="text-xs text-muted-foreground">{preview.explanation}{preview.capturedAt ? ` · ${clock(preview.capturedAt)}` : ""}</p>
                    </div>
                )}
            </Modal>
        </div>
    );
}

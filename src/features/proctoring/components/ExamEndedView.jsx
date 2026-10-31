"use client";

import { useState } from "react";
import { Activity, AlertTriangle, Award, CheckCircle2, ClipboardList, FileText, Gavel, ShieldAlert, ShieldCheck } from "lucide-react";

import Loader from "@/components/common/Loader";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import EvidenceThumbnail from "@/features/proctoring/components/EvidenceThumbnail";
import { useCreateProctoringAppeal, useProctoredAttemptResult } from "@/hooks/queries/student/useProctoredExam";
import { formatSavedAnswer } from "@/lib/proctoring/examLogic";
import { DECISION_FOR_STUDENT } from "@/lib/proctoring/reviewLabels";

const HOW_IT_ENDED = { STUDENT: "Submitted by you", TIME: "Time ran out", PROCTORING: "Ended by proctoring" };
const IDENTITY = { FACE_CHECK_PASSED: "Face check passed (automated)", FACE_CHECK_FAILED: "Face check failed", NOT_ANALYSED: "Not analysed", PENDING: "Not analysed" };
const MICROPHONE = { GRANTED: "On", REFUSED: "Not available", UNKNOWN: "Not checked" };

const time = (value) => (value ? new Date(value).toLocaleTimeString() : "");

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

function Tile({ label, children, large = false }) {
    return (
        <div className="min-w-0 rounded-lg border border-border bg-background/60 p-2 text-center">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
            <span className={`block font-bold leading-snug text-foreground ${large ? "text-lg" : "text-xs"}`}>{children}</span>
        </div>
    );
}

/** A decision, and the student's one chance to ask for another look at it. */
function DecisionPanel({ attemptId, decision }) {
    const appeal = useCreateProctoringAppeal(attemptId);
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState("");

    return (
        <Section icon={Gavel} title="Your instructor's decision">
            <p className="text-sm font-medium text-foreground">{DECISION_FOR_STUDENT[decision.decision]}</p>
            {decision.note && <p className="whitespace-pre-line rounded-lg border border-border bg-background/60 p-2.5 text-sm text-foreground">{decision.note}</p>}
            {decision.appealPending && <p className="text-sm text-amber-800 dark:text-amber-300">You asked for this to be looked at again. Your instructor will reply.</p>}
            {decision.canAppeal && !open && (
                <div className="flex flex-col gap-1">
                    <Button type="button" variant="outline" onClick={() => setOpen(true)}>Ask for this to be looked at again</Button>
                    <p className="text-[11px] text-muted-foreground">You can ask once, until {new Date(decision.appealUntil).toLocaleDateString()}.</p>
                </div>
            )}
            {decision.canAppeal && open && (
                <form
                    className="flex flex-col gap-2"
                    onSubmit={(event) => {
                        event.preventDefault();
                        appeal.mutate(reason.trim());
                    }}
                >
                    <label className="flex flex-col gap-1 text-xs font-medium text-foreground">
                        What should your instructor look at again?
                        <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} maxLength={2000} className="rounded-lg border border-border bg-background p-2 text-sm font-normal text-foreground outline-none focus:border-primary/50" />
                    </label>
                    {appeal.isError && <p role="alert" className="text-xs text-rose-600">{appeal.error?.response?.data?.message || "Your request could not be sent. Please try again."}</p>}
                    <Button type="submit" disabled={reason.trim().length < 5 || appeal.isPending} loading={appeal.isPending}>Send request</Button>
                </form>
            )}
        </Section>
    );
}

/**
 * The exam-ended view. It keeps everything: the reason, score, violations, evidence in a lightbox,
 * identity and telemetry. Students never see a confidence score: the server does not send one.
 */
export default function ExamEndedView({ attemptId, onLeave, leaveLabel = "Back to the course" }) {
    const { data: result, isLoading, isError, refetch } = useProctoredAttemptResult(attemptId);
    const [preview, setPreview] = useState(null);
    const [tab, setTab] = useState(null);

    if (isLoading) {
        return (
            <div className="flex min-h-dvh items-center justify-center">
                <Loader />
            </div>
        );
    }
    if (isError || !result) {
        return (
            <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
                <p role="alert" className="text-sm text-foreground">The result could not be loaded.</p>
                <Button type="button" onClick={() => refetch()}>Try again</Button>
                <Button type="button" variant="outline" onClick={() => onLeave(null)}>{leaveLabel}</Button>
            </div>
        );
    }

    const terminated = result.outcome === "ENDED_BY_PROCTORING";
    const underReview = result.outcome === "UNDER_REVIEW";
    const voided = result.outcome === "VOIDED";
    const retake = result.outcome === "RETAKE_ALLOWED" || result.decision?.decision === "RETAKE";
    const passed = result.passed && !terminated;
    const activeTab = tab ?? (result.violations.length > 0 ? "violations" : "answers");
    const savedCount = result.answers.filter((answer) => answer.saved).length;
    const HeadingIcon = terminated ? ShieldAlert : passed ? CheckCircle2 : Award;

    return (
        <main className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-3 p-3 lg:h-dvh lg:min-h-0">
            <header className="flex items-center justify-between gap-4 border-b border-border pb-2">
                <div className="min-w-0">
                    <h1 className={`flex items-center gap-2 text-base font-bold ${terminated ? "text-rose-600 dark:text-rose-400" : "text-foreground"}`}>
                        <HeadingIcon className="h-4 w-4 shrink-0" aria-hidden />
                        {terminated ? "Ended by proctoring" : voided ? "Attempt voided" : passed ? "Exam passed" : "Exam completed"}
                        {underReview && <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:text-amber-300">Under review</span>}
                    </h1>
                    {result.endedAt && <p className="text-xs text-muted-foreground">Ended at {time(result.endedAt)} on {new Date(result.endedAt).toLocaleDateString()}</p>}
                </div>
                <div className="shrink-0 text-right">
                    <span className="block text-xs font-bold text-foreground">{result.quiz.title}</span>
                    <span className="text-[11px] text-muted-foreground">{result.answers.length} questions · Pass mark {result.quiz.passingScore}%</span>
                </div>
            </header>

            <div className="grid grid-cols-1 gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-2">
                <div className="flex flex-col gap-3 lg:min-h-0 lg:overflow-y-auto">
                    <Section icon={FileText} title={terminated ? "Why it ended" : "Summary"}>
                        {terminated && (
                            <div className="flex items-start gap-2 rounded-lg border border-rose-500/25 bg-rose-500/10 p-2.5">
                                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden />
                                <div>
                                    <p className="text-sm font-medium text-rose-700 dark:text-rose-300">{result.reason}</p>
                                    {!result.decision && (
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            This attempt has been used and does not count as a pass. Your instructor will review it and decide whether to uphold it or allow a retake. A person makes that decision.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                        {underReview && (
                            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-sm text-amber-800 dark:text-amber-300">
                                Your score stands for now. Your instructor will review this attempt, and a person makes any decision about it.
                            </p>
                        )}
                        {!terminated && !underReview && !result.decision && <p className="rounded-lg border border-border bg-background/60 p-2.5 text-xs text-muted-foreground">Your saved answers were marked against the quiz.</p>}
                        <div className="grid grid-cols-3 gap-2">
                            <Tile label="Warnings">{result.warningCount} / {result.maxWarnings ?? 3}</Tile>
                            <Tile label="Violations recorded">{result.violationCount ?? result.violations.length}</Tile>
                            <Tile label="Answers saved">{savedCount} of {result.answers.length}</Tile>
                        </div>
                    </Section>

                    {result.decision && <DecisionPanel attemptId={result.attemptId} decision={result.decision} />}

                    <Section icon={Award} title="Result">
                        <div className="grid grid-cols-3 gap-2">
                            <Tile label="Score" large>{result.score ?? "-"} / {result.totalMarks ?? "-"}</Tile>
                            <Tile label="Percentage" large>{result.percentage ?? "-"}%</Tile>
                            <Tile label="Pass mark" large>{result.quiz.passingScore}%</Tile>
                        </div>
                    </Section>

                    <Section icon={ShieldCheck} title="Identity and monitoring">
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            <Tile label="How it ended">{HOW_IT_ENDED[result.endedBy] ?? "Ended"}</Tile>
                            <Tile label="Identity check">{IDENTITY[result.identityCheck] ?? "Not analysed"}</Tile>
                            <Tile label="Microphone">{MICROPHONE[result.microphoneStatus] ?? "Not checked"}</Tile>
                            <Tile label="Photos sent">{result.telemetry.framesReceived}</Tile>
                            <Tile label="Photos checked">{result.telemetry.framesAnalysed}</Tile>
                            <Tile label="Longest gap">{result.telemetry.longestGapSeconds != null ? `${result.telemetry.longestGapSeconds}s` : "-"}</Tile>
                        </div>
                    </Section>
                </div>

                <section className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3 lg:min-h-0">
                    <div role="tablist" aria-label="Exam details" className="grid grid-cols-2 gap-1 rounded-lg bg-background/60 p-1">
                        {[
                            ["violations", `Events and photos (${result.violations.length})`],
                            ["answers", `Your answers (${savedCount} of ${result.answers.length})`],
                        ].map(([id, label]) => (
                            <button
                                key={id}
                                type="button"
                                role="tab"
                                id={`ended-tab-${id}`}
                                aria-selected={activeTab === id}
                                aria-controls={`ended-panel-${id}`}
                                onClick={() => setTab(id)}
                                className={`rounded-md px-2 py-1.5 text-[11px] font-bold transition ${activeTab === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Both stay mounted, so switching tabs does not fetch the photos again. */}
                    <div role="tabpanel" id="ended-panel-violations" aria-labelledby="ended-tab-violations" hidden={activeTab !== "violations"} className="max-h-96 overflow-y-auto rounded-lg border border-border lg:max-h-none lg:min-h-0 lg:flex-1">
                        {result.violations.length > 0 ? (
                            <ol className="divide-y divide-border">
                                {result.violations.map((violation) => (
                                    <li key={violation.id} className="flex items-center justify-between gap-3 p-2.5">
                                        <div className="min-w-0 flex-1 space-y-0.5">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <span className="font-mono text-[11px] text-muted-foreground">{time(violation.timestamp)}</span>
                                                {violation.warningNumber && (
                                                    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300">Warning {violation.warningNumber}</span>
                                                )}
                                            </div>
                                            <p className="text-xs font-semibold text-foreground">{violation.explanation}</p>
                                        </div>
                                        <div className="shrink-0">
                                            {violation.evidenceId ? (
                                                <EvidenceThumbnail evidenceId={violation.evidenceId} explanation={violation.explanation} capturedAt={violation.evidenceCapturedAt} onOpen={setPreview} />
                                            ) : (
                                                <span className="block w-16 text-center text-[10px] italic text-muted-foreground">No photo</span>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        ) : (
                            <div className="flex flex-col items-center gap-1.5 p-6 text-center text-xs text-muted-foreground">
                                <Activity className="h-5 w-5" aria-hidden />
                                Nothing was recorded during this exam.
                            </div>
                        )}
                    </div>

                    <div role="tabpanel" id="ended-panel-answers" aria-labelledby="ended-tab-answers" hidden={activeTab !== "answers"} className="max-h-96 overflow-y-auto rounded-lg border border-border lg:max-h-none lg:min-h-0 lg:flex-1">
                        {result.answers.length > 0 ? (
                            <ul className="divide-y divide-border text-xs">
                                {result.answers.map((answer, index) => (
                                    <li key={answer.questionId} className="space-y-1 p-2.5">
                                        <div className="flex items-start justify-between gap-3">
                                            <span className="font-semibold text-foreground">Q{index + 1}: {answer.questionText}</span>
                                            <span className="shrink-0 text-[11px] font-bold text-muted-foreground">{answer.marks} {answer.marks === 1 ? "mark" : "marks"}</span>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground">{answer.saved ? <>Your answer: <strong className="text-foreground">{formatSavedAnswer(answer.answer)}</strong></> : <em>Not answered</em>}</p>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="flex flex-col items-center gap-1.5 p-6 text-center text-xs text-muted-foreground">
                                <ClipboardList className="h-5 w-5" aria-hidden />
                                No answers were recorded.
                            </div>
                        )}
                    </div>
                </section>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
                {retake && !result.decision?.appealPending && (
                    <Button type="button" onClick={() => window.location.reload()} className="flex-1">Start your retake</Button>
                )}
                <Button type="button" variant={retake ? "outline" : "primary"} onClick={() => onLeave(result)} className="flex-1">{leaveLabel}</Button>
            </div>

            <Modal open={Boolean(preview)} onClose={() => setPreview(null)} title="Photo from your exam" size="lg">
                {preview && (
                    <div className="flex flex-col gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={preview.url} alt="" className="mx-auto max-h-[65vh] w-auto max-w-full rounded-lg" />
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            {preview.explanation} {preview.capturedAt ? `· ${time(preview.capturedAt)}` : ""}
                        </p>
                    </div>
                )}
            </Modal>
        </main>
    );
}

"use client";

import { useCallback, useState } from "react";
import { Check, CheckCircle2, Clock, Info, Lock, ShieldAlert } from "lucide-react";

import Loader from "@/components/common/Loader";
import Button from "@/components/ui/Button";
import { AMBER_PILL, GREEN_PILL, Panel, PhotoViewer, Pill, ROSE_PILL, ScoreRing, WarningsPanel } from "@/features/proctoring/components/ReportParts";
import { useCreateProctoringAppeal, useProctoredAttemptResult } from "@/hooks/queries/student/useProctoredExam";
import { describeExamEnding, formatSavedAnswer } from "@/lib/proctoring/examLogic";
import { DECISION_FOR_STUDENT } from "@/lib/proctoring/reviewLabels";

/** The look of each ending, so they cannot be mistaken for one another. */
const ENDING_LOOK = {
    PROCTORING: { icon: ShieldAlert, box: "border-rose-500/30 bg-rose-500/10", accent: "text-rose-700 dark:text-rose-300" },
    TIME: { icon: Clock, box: "border-amber-500/30 bg-amber-500/10", accent: "text-amber-800 dark:text-amber-300" },
    STUDENT: { icon: CheckCircle2, box: "border-border bg-card", accent: "text-foreground" },
    OTHER: { icon: Info, box: "border-border bg-card", accent: "text-foreground" },
};
const ENDED_EVENT = "AUTO_TERMINATION_ENFORCED";

const time = (value) => (value ? new Date(value).toLocaleTimeString() : "");

function NextStep({ state, number, title, children }) {
    const look = state === "done" ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : state === "now" ? "border-amber-500 text-amber-600 ring-4 ring-amber-500/15 dark:text-amber-400" : "border-border text-muted-foreground";
    return (
        <li className="relative grid grid-cols-[28px_1fr] gap-3 pb-3 last:pb-0 [&:not(:last-child)]:before:absolute [&:not(:last-child)]:before:bottom-0 [&:not(:last-child)]:before:left-[13px] [&:not(:last-child)]:before:top-7 [&:not(:last-child)]:before:w-0.5 [&:not(:last-child)]:before:bg-border">
            <span className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold ${look}`}>{state === "done" ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden /> : number}</span>
            <div className="text-xs text-muted-foreground">
                <p className="text-sm font-semibold text-foreground">{title}</p>
                {children}
            </div>
        </li>
    );
}

/** A decision, and the student's one chance to ask for another look at it. */
function DecisionPanel({ attemptId, decision }) {
    const appeal = useCreateProctoringAppeal(attemptId);
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState("");

    return (
        <Panel title="Your instructor's decision">
            <p className="text-sm font-medium text-foreground">{DECISION_FOR_STUDENT[decision.decision]}</p>
            {decision.note && <p className="whitespace-pre-line rounded-lg border border-border bg-card p-2.5 text-sm text-foreground">{decision.note}</p>}
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
        </Panel>
    );
}

function OverviewPanel({ result, passed, savedCount, warningEvents, reviewable, onShowWarnings, warningsTabLabel }) {
    const decision = result.decision;
    const maxWarnings = result.maxWarnings ?? 3;
    const limitReached = result.warningCount >= maxWarnings;
    return (
        <div className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-3">
                <Panel title="Score" aside={<Pill tone={passed ? GREEN_PILL : ROSE_PILL}>{passed ? "Passed" : "Not passed"}</Pill>}>
                    <div className="flex items-center gap-4">
                        <ScoreRing percentage={result.percentage} passingScore={result.quiz.passingScore} passed={passed} />
                        <div>
                            <p className="text-3xl font-extrabold leading-none text-foreground">
                                {result.score ?? "-"}
                                <span className="text-base font-semibold text-muted-foreground"> / {result.totalMarks ?? "-"}</span>
                            </p>
                            <p className="mt-1.5 text-xs text-muted-foreground">Pass mark {result.quiz.passingScore}%</p>
                        </div>
                    </div>
                </Panel>
                <Panel title="Warnings" aside={limitReached ? <Pill tone={AMBER_PILL}>Limit reached</Pill> : null}>
                    <p className="text-3xl font-extrabold leading-none text-foreground">
                        {result.warningCount}
                        <span className="text-base font-semibold text-muted-foreground"> / {maxWarnings}</span>
                    </p>
                    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${maxWarnings}, minmax(0, 1fr))` }} aria-hidden>
                        {Array.from({ length: maxWarnings }, (_, index) => (
                            <span key={index} className={`h-3 rounded ${index < result.warningCount ? "bg-amber-400" : "bg-muted"}`} />
                        ))}
                    </div>
                    {onShowWarnings ? (
                        <button type="button" onClick={onShowWarnings} className="w-fit text-xs font-semibold text-primary underline underline-offset-2">
                            {warningEvents.length > 0 ? `See the ${warningEvents.length === 1 ? "warning" : `${warningEvents.length} warnings`} and photos` : `Open ${warningsTabLabel.toLowerCase()}`}
                        </button>
                    ) : (
                        <p className="text-xs text-muted-foreground">No warnings during this exam.</p>
                    )}
                </Panel>
                <Panel title="Answers saved">
                    <p className="text-3xl font-extrabold leading-none text-foreground">
                        {savedCount}
                        <span className="text-base font-semibold text-muted-foreground"> / {result.answers.length}</span>
                    </p>
                    <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                        <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${result.answers.length ? (savedCount / result.answers.length) * 100 : 0}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground">{savedCount === 0 ? "No answers were saved before the exam ended." : "Saved answers were marked."}</p>
                </Panel>
            </div>

            {reviewable && (
                <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr]">
                    <Panel title="What happens next">
                        <ol>
                            <NextStep state="done" number={1} title="Attempt saved">Your answers and the recorded events are with your instructor.</NextStep>
                            <NextStep state={decision ? "done" : "now"} number={2} title={decision ? "Instructor review · decided" : "Instructor review · in progress"}>
                                They decide whether to uphold the result or allow a retake. A person makes this decision.
                            </NextStep>
                            <NextStep state={decision?.appealPending ? "now" : "next"} number={3} title="Ask for another look">
                                If you disagree with the decision, you can ask once.
                            </NextStep>
                        </ol>
                    </Panel>
                    {decision ? (
                        <DecisionPanel attemptId={result.attemptId} decision={decision} />
                    ) : (
                        <Panel title="Ask for another look" aside={<Lock className="h-3.5 w-3.5" aria-hidden />}>
                            <p className="text-sm text-muted-foreground">Available once your instructor has made a decision. You will be able to explain what they should look at again.</p>
                            <Button type="button" variant="outline" disabled className="mt-auto">Ask for this to be looked at again</Button>
                        </Panel>
                    )}
                </div>
            )}
        </div>
    );
}

function AnswersPanel({ answers }) {
    const [selected, setSelected] = useState(0);
    if (answers.length === 0) return <p className="rounded-xl border border-border bg-background/60 p-4 text-sm text-muted-foreground">No answers were recorded.</p>;
    const answer = answers[selected];
    return (
        <div className="grid items-start gap-4 lg:grid-cols-[1.2fr_1fr]">
            <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">Choose a question to see your answer. Green ones were answered.</p>
                <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10">
                    {answers.map((row, index) => (
                        <button
                            key={row.questionId}
                            type="button"
                            onClick={() => setSelected(index)}
                            aria-pressed={selected === index}
                            aria-label={`Question ${index + 1}, ${row.saved ? "answered" : "not answered"}`}
                            className={`aspect-square rounded-lg border text-xs font-bold transition ${
                                selected === index ? "border-primary bg-primary text-primary-foreground" : row.saved ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 hover:border-emerald-500 dark:text-emerald-400" : "border-border bg-background/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                            }`}
                        >
                            {index + 1}
                        </button>
                    ))}
                </div>
            </div>
            <Panel title={`Question ${selected + 1}`} aside={<span className="normal-case tracking-normal">{answer.marks} {answer.marks === 1 ? "mark" : "marks"}</span>}>
                <p className="text-sm font-semibold text-foreground">{answer.questionText}</p>
                <p className="rounded-lg border border-border bg-card p-2.5 text-sm text-muted-foreground">
                    {answer.saved ? (
                        <>
                            Your answer: <strong className="text-foreground">{formatSavedAnswer(answer.answer)}</strong>
                        </>
                    ) : (
                        <em>Not answered</em>
                    )}
                </p>
            </Panel>
        </div>
    );
}

/**
 * The exam-ended view, as a short report: an outcome banner, then Overview, the warnings (with their
 * photos only) and the answers, each on its own tab. Monitoring numbers are for instructors and are
 * not shown here. Students never see a confidence score: the server does not send one. It fits a
 * laptop screen; on a small screen it is an ordinary page.
 */
export default function ExamEndedView({ attemptId, onLeave, leaveLabel = "Back to the course", justEnded = false }) {
    const { data: result, isLoading, isError, refetch } = useProctoredAttemptResult(attemptId);
    const [tab, setTab] = useState("overview");
    const [zoom, setZoom] = useState(null);
    const [photoUrls, setPhotoUrls] = useState({});
    const rememberPhoto = useCallback((evidenceId, url) => setPhotoUrls((current) => ({ ...current, [evidenceId]: url })), []);

    if (isLoading) {
        return (
            <div role="status" className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
                <Loader />
                {justEnded && <p className="text-sm font-medium text-foreground">Your exam has ended. Getting your results…</p>}
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
    const retake = result.outcome === "RETAKE_ALLOWED" || result.decision?.decision === "RETAKE";
    const passed = result.passed && !terminated;
    const savedCount = result.answers.filter((answer) => answer.saved).length;
    const ending = describeExamEnding(result);
    const look = ENDING_LOOK[ending.kind];
    const EndingIcon = look.icon;
    const maxWarnings = result.maxWarnings ?? 3;

    const warningEvents = result.violations.filter((violation) => violation.warningNumber);
    const endingEvent = result.violations.find((violation) => violation.eventType === ENDED_EVENT) ?? null;
    const recordedOnly = result.violations.filter((violation) => !violation.warningNumber && violation.eventType !== ENDED_EVENT);
    // An exam can end without a warning (a sustained phone, say). Then its last photos explain why.
    const featured = warningEvents.length > 0 ? warningEvents : terminated ? recordedOnly.filter((violation) => violation.evidenceId).slice(-3) : [];
    const others = recordedOnly.filter((violation) => !featured.includes(violation));
    const showWarningsTab = warningEvents.length > 0 || terminated;
    const warningsTabLabel = terminated ? "Why it ended" : "Warnings";
    const reviewable = terminated || underReview || Boolean(result.decision);
    const awaitingReview = (terminated && !result.decision) || underReview;

    const tabs = [
        { id: "overview", label: "Overview" },
        ...(showWarningsTab ? [{ id: "warnings", label: warningsTabLabel, count: featured.length }] : []),
        { id: "answers", label: "Answers", count: `${savedCount}/${result.answers.length}` },
    ];
    const activeTab = tabs.some((item) => item.id === tab) ? tab : "overview";

    return (
        <main className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col justify-center p-3 sm:p-4 lg:h-dvh lg:min-h-0">
            <div className="flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-card lg:max-h-full lg:min-h-0">
                <header className={`flex shrink-0 flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 ${look.box}`}>
                    <div className="flex min-w-0 items-start gap-3">
                        <EndingIcon className={`mt-0.5 h-7 w-7 shrink-0 ${look.accent}`} aria-hidden />
                        <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className={`text-xl font-bold leading-tight ${look.accent}`}>{ending.title}</h1>
                                {awaitingReview && <Pill tone={AMBER_PILL}>Awaiting instructor review</Pill>}
                            </div>
                            <p className={`text-sm font-medium ${look.accent}`}>{ending.detail}</p>
                            {terminated && !result.decision && <p className="text-xs text-muted-foreground">This attempt has been used and does not count as a pass. Your instructor will review it and decide whether to uphold it or allow a retake.</p>}
                            {underReview && <p className="text-xs text-muted-foreground">Your score stands for now. Your instructor will review this attempt, and a person makes any decision about it.</p>}
                        </div>
                    </div>
                    <div className="shrink-0 sm:max-w-xs sm:text-right">
                        <span className="block text-sm font-bold text-foreground">{result.quiz.title}</span>
                        <span className="block text-xs text-muted-foreground">
                            {result.answers.length} questions · Pass mark {result.quiz.passingScore}%
                        </span>
                        {result.endedAt && <span className="block text-xs text-muted-foreground">Ended {time(result.endedAt)}, {new Date(result.endedAt).toLocaleDateString()}</span>}
                    </div>
                </header>

                <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-2 sm:px-4">
                    <div role="tablist" aria-label="Exam result" className="flex min-w-0 flex-1 flex-wrap gap-1">
                        {tabs.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                role="tab"
                                id={`ended-tab-${item.id}`}
                                aria-selected={activeTab === item.id}
                                aria-controls={`ended-panel-${item.id}`}
                                onClick={() => setTab(item.id)}
                                className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${activeTab === item.id ? "border-emerald-500 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                            >
                                {item.label}
                                {item.count !== undefined && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{item.count}</span>}
                            </button>
                        ))}
                    </div>
                    <div className="flex shrink-0 gap-2 py-2">
                        {retake && !result.decision?.appealPending && (
                            <Button type="button" onClick={() => window.location.reload()} className="!min-h-[38px]">Start your retake</Button>
                        )}
                        <Button type="button" variant={retake ? "outline" : "primary"} onClick={() => onLeave(result)} className="!min-h-[38px]">{leaveLabel}</Button>
                    </div>
                </div>

                <div className="p-4 sm:p-5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
                    <div role="tabpanel" id="ended-panel-overview" aria-labelledby="ended-tab-overview" hidden={activeTab !== "overview"}>
                        <OverviewPanel
                            result={result}
                            passed={passed}
                            savedCount={savedCount}
                            warningEvents={warningEvents}
                            reviewable={reviewable}
                            warningsTabLabel={warningsTabLabel}
                            onShowWarnings={showWarningsTab ? () => setTab("warnings") : null}
                        />
                    </div>
                    {/* Stays mounted, so switching tabs does not fetch the photos again. */}
                    {showWarningsTab && (
                        <div role="tabpanel" id="ended-panel-warnings" aria-labelledby="ended-tab-warnings" hidden={activeTab !== "warnings"}>
                            <WarningsPanel featured={featured} others={others} endingEvent={endingEvent} maxWarnings={maxWarnings} onOpen={setZoom} onLoaded={rememberPhoto} />
                        </div>
                    )}
                    <div role="tabpanel" id="ended-panel-answers" aria-labelledby="ended-tab-answers" hidden={activeTab !== "answers"}>
                        <AnswersPanel answers={result.answers} />
                    </div>
                </div>
            </div>

            <PhotoViewer
                items={featured}
                index={zoom}
                onIndexChange={setZoom}
                onClose={() => setZoom(null)}
                photoUrls={photoUrls}
                title={(photo) => (photo.warningNumber ? `Warning ${photo.warningNumber} of ${maxWarnings} · ${time(photo.timestamp)}` : `Photo from your exam · ${time(photo.timestamp)}`)}
            />
        </main>
    );
}

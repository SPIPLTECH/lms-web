"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Check, Loader2, RefreshCw } from "lucide-react";

import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/context/ConfirmContext";
import { useEvaluationDecision, useSubmissionEvaluation } from "@/hooks/queries/instructor/useAssignmentEvaluation";
import { decisionErrorMessage, reviewActions } from "@/lib/assignmentEvaluationState";
import {
  ConfidencePill,
  CriteriaEvidence,
  EvaluationStatusBadge,
  Field,
  INPUT_CLASS,
  Pill,
  PRIMARY_BUTTON_CLASS,
  SMALL_BUTTON_CLASS,
  fmtMarks,
} from "./evaluationUi";

const PDF_METHOD = {
  TEXT: "text read from the PDF",
  OCR: "scanned PDF, read by OCR",
  MIXED: "partly scanned PDF, some pages read by OCR",
  NONE: "no readable text in the PDF",
};

/** The evaluation's audit trail, in words. */
const AUDIT_ACTION = {
  SUBMITTED: "Student submitted",
  EVALUATED: "Evaluated automatically",
  EVALUATION_FAILED: "Automatic evaluation failed",
  STALE_RESULT_DISCARDED: "Outdated result discarded (work or scheme changed while it ran)",
  SKIPPED_GRADED: "Not re-evaluated: already graded",
  REEVALUATION_REQUESTED: "Re-evaluation requested",
  REOPENED: "Reopened for re-evaluation",
  APPROVED: "Approved and published",
  OVERRIDDEN: "Marks set and published",
  HAND_GRADED: "Graded by hand",
};

const timeAgo = (value) => (value ? formatDistanceToNow(new Date(value), { addSuffix: true }) : "");

function OverrideForm({ submissionId, current, expectedVersion, maxMarks, markStep, onDone, onCancel, decision }) {
  const criteria =
    current?.result && !current.result.failed && current.maxMarks === maxMarks && Array.isArray(current.result.criteria)
      ? current.result.criteria
      : [];
  const [mode, setMode] = useState(criteria.length ? "criteria" : "total");
  const [values, setValues] = useState(() => Object.fromEntries(criteria.map((c) => [c.criterionId, String(c.awarded)])));
  const [total, setTotal] = useState(String(current ? current.marksAwarded : 0));
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const { showToast } = useToast();

  const submit = (e) => {
    e.preventDefault();
    const payload = { submissionId, expectedVersion, reason, comment: comment || undefined };
    if (mode === "criteria") payload.criteria = criteria.map((c) => ({ criterionId: String(c.criterionId), awarded: Number(values[c.criterionId]) }));
    else payload.marksAwarded = Number(total);
    decision.override.mutate(payload, {
      onSuccess: () => {
        showToast("Marks saved and published to the student.", "success");
        onDone();
      },
      onError: (error) => showToast(decisionErrorMessage(error, "Could not save the marks."), "error"),
    });
  };

  return (
    <form onSubmit={submit} className="space-y-2 rounded-lg border border-border bg-background p-3">
      <p className="text-[11px] font-bold text-foreground">Set the marks</p>
      <p className="text-[11px] text-muted-foreground">Saving publishes these marks to the student.</p>
      {criteria.length > 0 && (
        <div className="flex gap-1" role="group" aria-label="How to set the marks">
          {[["criteria", "Per criterion"], ["total", "Total only"]].map(([key, label]) => (
            <button key={key} type="button" aria-pressed={mode === key} onClick={() => setMode(key)}
              className={`${SMALL_BUTTON_CLASS} ${mode === key ? "border-primary/60 bg-primary/10" : ""}`}>
              {label}
            </button>
          ))}
        </div>
      )}
      {mode === "criteria" ? (
        <div className="space-y-1.5">
          {criteria.map((c) => (
            <div key={c.criterionId} className="flex items-center gap-2">
              <span className="flex-1 text-[11px] text-foreground">{c.description}</span>
              <input
                aria-label={`Marks for ${c.description}`}
                className={`${INPUT_CLASS} w-20`}
                type="number" min="0" max={c.maxMarks} step={markStep}
                value={values[c.criterionId]}
                onChange={(e) => setValues({ ...values, [c.criterionId]: e.target.value })}
              />
              <span className="font-mono text-[11px] text-muted-foreground">/ {fmtMarks(c.maxMarks)}</span>
            </div>
          ))}
        </div>
      ) : (
        <Field label={`Marks (out of ${fmtMarks(maxMarks)}, steps of ${markStep})`} className="max-w-xs">
          <input className={INPUT_CLASS} type="number" min="0" max={maxMarks} step={markStep} value={total} onChange={(e) => setTotal(e.target.value)} />
        </Field>
      )}
      <Field label="Reason" hint="(kept in the evaluation history, not shown to the student)">
        <input className={INPUT_CLASS} value={reason} onChange={(e) => setReason(e.target.value)} required minLength={3} maxLength={1000} />
      </Field>
      <Field label="Comment for the student" hint="(optional)">
        <textarea className={`${INPUT_CLASS} resize-y`} rows={2} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={2000} />
      </Field>
      <div className="flex gap-2">
        <button type="submit" className={PRIMARY_BUTTON_CLASS} disabled={decision.override.isPending}>
          {decision.override.isPending && <Loader2 size={12} className="animate-spin" />} Save and publish
        </button>
        <button type="button" className={SMALL_BUTTON_CLASS} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

/**
 * The evaluator's suggestion for one submission, the evidence behind it, and
 * the instructor's decision. Nothing reaches the student until the instructor
 * approves the suggestion or sets the marks; both write the grade the student
 * sees (the same grade field the hand-grading form uses).
 */
export default function SubmissionEvaluationReview({ assignmentId, submission, markStep: fallbackStep = 0.5 }) {
  const { data, isLoading, isError } = useSubmissionEvaluation(assignmentId, submission.id);
  const decision = useEvaluationDecision(assignmentId);
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [overriding, setOverriding] = useState(false);
  const [comment, setComment] = useState("");

  if (isLoading) return <p className="text-[11px] font-semibold text-muted-foreground">Loading the evaluation…</p>;
  if (isError || !data) return <p role="alert" className="text-[11px] font-semibold text-red-600 dark:text-red-400">The evaluation could not be loaded.</p>;

  const current = data.current;
  const published = data.published;
  const job = data.job;
  const actions = reviewActions(data);
  const markStep = data.markStep || fallbackStep;
  const pdf = current?.inputMeta?.pdf;
  const running = data.status === "evaluating";
  const newerThanPublished = published && current && !current.isPublished;

  const accept = () => decision.accept.mutate(
    { submissionId: submission.id, expectedVersion: actions.expectedVersion, comment: comment || undefined },
    {
      onSuccess: () => {
        setComment("");
        showToast("Marks approved and published to the student.", "success");
      },
      onError: (error) => showToast(decisionErrorMessage(error, "Could not approve the marks."), "error"),
    }
  );

  const reEvaluate = async () => {
    let reopen = false;
    if (actions.reEvaluateNeedsReopen) {
      reopen = await confirm({
        title: "Re-evaluate a graded submission",
        message:
          "This submission already has a published grade. Re-evaluating creates a new suggestion for you to review; the student keeps the current grade until you approve new marks.",
        confirmText: "Re-evaluate",
      });
      if (!reopen) return;
    }
    decision.reEvaluate.mutate(
      { submissionId: submission.id, reopen },
      {
        onSuccess: () => showToast("Re-evaluation started. The result appears here when it is ready.", "success"),
        onError: (error) => showToast(decisionErrorMessage(error, "Could not re-evaluate."), "error"),
      }
    );
  };

  return (
    <section aria-label="Auto-evaluation" aria-busy={running} className="space-y-2 rounded-lg border border-border bg-background/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="flex-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Auto-evaluation</p>
        <EvaluationStatusBadge evaluation={{ status: data.status, marksAwarded: current?.marksAwarded ?? null, maxMarks: current?.maxMarks ?? null }} />
        {current?.source === "AUTO" && !running && <ConfidencePill value={current.confidence} />}
        <button
          type="button"
          className={SMALL_BUTTON_CLASS}
          onClick={reEvaluate}
          disabled={!actions.canReEvaluate || decision.reEvaluate.isPending}
        >
          {running || decision.reEvaluate.isPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Re-evaluate
        </button>
      </div>

      {running && (
        <p role="status" className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Loader2 size={12} className="animate-spin" />
          Evaluating this submission (scanned PDFs take longer). This updates by itself.
          {job?.attempts > 1 && job?.lastError ? ` Retrying after an error: ${job.lastError}` : ""}
        </p>
      )}

      {published && (
        <p className="rounded-lg border border-emerald-600/30 bg-emerald-500/10 px-3 py-2 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
          Published to the student: {fmtMarks(published.marksAwarded)}/{fmtMarks(published.maxMarks)}
          {published.publishedBy?.name ? `, by ${published.publishedBy.name}` : ""} {timeAgo(published.publishedAt)}.
          {newerThanPublished ? " The suggestion below is newer; the student keeps these marks until you approve or set new ones." : ""}
        </p>
      )}

      {!current ? (
        !running && (
          <p className="text-[11px] text-muted-foreground">
            {data.status === "failed"
              ? `Automatic evaluation failed${job?.lastError ? `: ${job.lastError}` : ""}. Set the marks yourself or re-evaluate.`
              : "Not evaluated yet. It usually takes a few seconds after submission (longer for scanned PDFs)."}
          </p>
        )
      ) : (
        <>
          {pdf && (
            <p className="text-[11px] text-muted-foreground">
              PDF {pdf.fileName ? `“${pdf.fileName}” ` : ""}— {pdf.error ? `could not be read: ${pdf.error}` : PDF_METHOD[pdf.method] || "read"}
              {pdf.ocrConfidence !== null && pdf.ocrConfidence !== undefined ? ` (OCR confidence ${Math.round(pdf.ocrConfidence * 100)}%)` : ""}
              {pdf.hasImages ? "; contains images, which are not evaluated" : ""}.
            </p>
          )}
          {current.source === "AUTO" && current.needsReview && current.reviewReasons.length > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
              <p className="text-[11px] font-black text-amber-700 dark:text-amber-400">Check before approving:</p>
              <ul className="list-disc pl-4 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                {current.reviewReasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}
          {current.source === "INSTRUCTOR" && current.overrideReason && (
            <p className="text-[11px] text-muted-foreground">
              Your note: {current.overrideReason}{current.instructorComment ? ` · To the student: “${current.instructorComment}”` : ""}
            </p>
          )}

          <details>
            <summary className="cursor-pointer text-[11px] font-bold text-muted-foreground">Why these marks (evidence per criterion)</summary>
            <div className="pt-2"><CriteriaEvidence result={current.result} /></div>
          </details>
          {current.inputText && pdf && (
            <details>
              <summary className="cursor-pointer text-[11px] font-bold text-muted-foreground">Text the evaluator read</summary>
              <p className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground">
                {current.inputText}
              </p>
            </details>
          )}
        </>
      )}

      {!overriding && (actions.canApprove || actions.canOverride || actions.approveBlockedReason) && (
        <div className="space-y-2">
          {actions.approveBlockedReason && (
            <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">{actions.approveBlockedReason}</p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            {actions.canApprove && (
              <>
                <Field label="Comment for the student" hint="(optional)" className="flex-1">
                  <input className={INPUT_CLASS} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={2000} />
                </Field>
                <button type="button" className={PRIMARY_BUTTON_CLASS} onClick={accept} disabled={decision.accept.isPending}>
                  {decision.accept.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  Approve and publish {fmtMarks(current.marksAwarded)}/{fmtMarks(current.maxMarks)}
                </button>
              </>
            )}
            {actions.canOverride && (
              <button type="button" className={SMALL_BUTTON_CLASS} onClick={() => setOverriding(true)}>
                {published ? "Change published marks" : "Set different marks"}
              </button>
            )}
          </div>
        </div>
      )}
      {overriding && (
        <OverrideForm
          submissionId={submission.id}
          current={current}
          expectedVersion={actions.expectedVersion}
          maxMarks={data.assignmentMarks}
          markStep={markStep}
          decision={decision}
          onDone={() => setOverriding(false)}
          onCancel={() => setOverriding(false)}
        />
      )}

      {data.history.length > 1 && (
        <details>
          <summary className="cursor-pointer text-[11px] font-bold text-muted-foreground">History ({data.history.length} versions)</summary>
          <ul className="mt-1 space-y-1">
            {data.history.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span className="font-mono">v{h.version}</span>
                <Pill tone={h.source === "INSTRUCTOR" ? "ok" : "muted"}>{h.source === "INSTRUCTOR" ? h.createdBy?.name || "Instructor" : "Automatic"}</Pill>
                <span className="font-mono text-foreground">{fmtMarks(h.marksAwarded)}/{fmtMarks(h.maxMarks)}</span>
                {h.rubricVersion ? <span>scheme v{h.rubricVersion}</span> : null}
                {h.overrideReason && <span>“{h.overrideReason}”</span>}
                {h.failed && <span>failed</span>}
                {h.needsReview && !h.failed && <span>flagged for review</span>}
                <span>{timeAgo(h.createdAt)}</span>
                {h.isPublished && <Pill tone="ok">published</Pill>}
                {h.isCurrent && <Pill tone="info">current</Pill>}
              </li>
            ))}
          </ul>
        </details>
      )}
      {data.audit.length > 0 && (
        <details>
          <summary className="cursor-pointer text-[11px] font-bold text-muted-foreground">Activity ({data.audit.length})</summary>
          <ul className="mt-1 space-y-1">
            {data.audit.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span className="text-foreground">{AUDIT_ACTION[a.action] || a.action}</span>
                {a.actor?.name && <span>by {a.actor.name}</span>}
                <span>{timeAgo(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Sparkles, Trash2 } from "lucide-react";

import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/context/ConfirmContext";
import {
  useDeleteRubric,
  useEvaluateAll,
  usePreviewRubric,
  useRubric,
  useSaveRubric,
} from "@/hooks/queries/instructor/useAssignmentEvaluation";
import SynonymDictionary from "./SynonymDictionary";
import { RubricFields, checkRubricForm, toForm, toPayload } from "./rubricForm";
import {
  ConfidencePill,
  CriteriaEvidence,
  Field,
  INPUT_CLASS,
  Pill,
  PRIMARY_BUTTON_CLASS,
  SMALL_BUTTON_CLASS,
  fmtMarks,
} from "./evaluationUi";

/**
 * Auto-evaluation settings for one assignment: the marking scheme the
 * rule-based evaluator scores student answers against. Without a scheme the
 * assignment is graded by hand exactly as before. With one, every result is
 * a suggestion that waits for the instructor's approval.
 */

const errorMessage = (error, fallback) => error?.response?.data?.message || fallback;

function SampleAnswerTester({ assignmentId, form }) {
  const [text, setText] = useState("");
  const preview = usePreviewRubric(assignmentId);
  const result = preview.data;
  return (
    <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
      <p className="text-[11px] font-bold text-foreground">Try a sample answer <span className="font-semibold text-muted-foreground">(nothing is saved)</span></p>
      <Field label="Sample answer">
        <textarea className={`${INPUT_CLASS} resize-y`} rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type an answer a student might give…" />
      </Field>
      <button
        type="button"
        className={SMALL_BUTTON_CLASS}
        disabled={preview.isPending}
        onClick={() => preview.mutate({ rubric: toPayload(form), answerText: text })}
      >
        {preview.isPending ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Evaluate sample
      </button>
      {preview.isError && (
        <p role="alert" className="text-[11px] font-semibold text-red-600 dark:text-red-400">{errorMessage(preview.error, "Could not evaluate the sample.")}</p>
      )}
      {result && !preview.isPending && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-black text-foreground">
              {fmtMarks(result.marksAwarded)}/{fmtMarks(result.maxMarks)}
            </span>
            <ConfidencePill value={result.confidence} />
            {result.needsReview ? (
              <Pill tone="warn">Would be flagged for review</Pill>
            ) : (
              <Pill tone="info">Would be suggested for your approval</Pill>
            )}
          </div>
          {result.reviewReasons.length > 0 && (
            <ul className="list-disc pl-4 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
              {result.reviewReasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          )}
          <CriteriaEvidence result={result} />
          {result.feedback?.summary && (
            <p className="text-[11px] text-muted-foreground">Once approved, the student would read: {result.feedback.summary}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function AutoEvaluationPanel({ assignmentId }) {
  const { data, isLoading, isError } = useRubric(assignmentId);
  const saveMutation = useSaveRubric(assignmentId);
  const deleteMutation = useDeleteRubric(assignmentId);
  const evaluateAll = useEvaluateAll(assignmentId);
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(null);
  const [showSynonyms, setShowSynonyms] = useState(false);

  const rubric = data?.rubric || null;
  useEffect(() => {
    if (data) setForm(toForm(data.rubric, data.assignmentMarks));
  }, [data]);

  if (isLoading || !form) {
    return <p className="text-[11px] font-semibold text-muted-foreground">Loading auto-evaluation settings…</p>;
  }
  if (isError) {
    return <p role="alert" className="text-[11px] font-semibold text-red-600 dark:text-red-400">Auto-evaluation settings could not be loaded.</p>;
  }

  const save = (e) => {
    e.preventDefault();
    const problem = checkRubricForm(form);
    if (problem) {
      showToast(problem, "error");
      return;
    }
    saveMutation.mutate(toPayload(form), {
      onSuccess: (saved) => {
        const parts = ["Marking scheme saved."];
        if (saved?.marksChangedFrom !== null && saved?.marksChangedFrom !== undefined) {
          parts.push(`The assignment is now worth ${fmtMarks(saved.assignmentMarks)} marks (was ${fmtMarks(saved.marksChangedFrom)}).`);
        }
        if (saved?.requeued) parts.push(`Re-evaluating ${saved.requeued} ungraded submission(s).`);
        showToast(parts.join(" "), "success");
      },
      onError: (error) => showToast(errorMessage(error, "Could not save the marking scheme."), "error"),
    });
  };

  const remove = async () => {
    const confirmed = await confirm({
      title: "Remove auto-evaluation",
      message: "Past evaluations stay in each submission's history and published grades are kept. New submissions are graded by hand.",
      confirmText: "Remove",
    });
    if (!confirmed) return;
    deleteMutation.mutate(undefined, {
      onSuccess: () => { showToast("Auto-evaluation removed.", "success"); setOpen(false); },
      onError: (error) => showToast(errorMessage(error, "Could not remove the marking scheme."), "error"),
    });
  };

  const runAll = () => {
    evaluateAll.mutate(undefined, {
      onSuccess: (r) => {
        const skipped = r.skippedGraded ? ` ${r.skippedGraded} graded submission(s) were left as they are; reopen one from its review panel to re-evaluate it.` : "";
        showToast(`Re-evaluating ${r.queued} ungraded submission(s). The table updates when they are done.${skipped}`, "success");
      },
      onError: (error) => showToast(errorMessage(error, "Could not start the re-evaluation."), "error"),
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="flex-1 text-xs font-black uppercase tracking-widest text-foreground">Auto-evaluation</h2>
        {rubric ? (
          <>
            <Pill tone={rubric.enabled ? "ok" : "muted"}>{rubric.enabled ? "On" : "Off"}</Pill>
            <Pill tone="info">You approve every grade</Pill>
          </>
        ) : (
          <Pill>Not set up</Pill>
        )}
        <button type="button" className={SMALL_BUTTON_CLASS} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {rubric ? "Edit marking scheme" : "Set up auto-evaluation"}
        </button>
      </div>
      {!open && (
        <p className="text-[11px] text-muted-foreground">
          {rubric
            ? `Answers are checked against your marking scheme (version ${rubric.version}, ${rubric.criteria.length || "automatic"} criteria, ${fmtMarks(rubric.maxMarks)} marks). Students see marks only after you approve them.`
            : "Let the LMS suggest marks for written and PDF answers from your ideal answer and marking criteria. It matches key ideas and wording; it does not understand answers like a person. Students see marks only after you approve them."}
        </p>
      )}

      {open && (
        <form onSubmit={save} className="space-y-3">
          <RubricFields form={form} setForm={setForm} assignmentMarks={data?.assignmentMarks ?? null} />

          <SampleAnswerTester assignmentId={assignmentId} form={form} />

          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" className={PRIMARY_BUTTON_CLASS} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : null}
              Save marking scheme
            </button>
            {rubric?.enabled && (
              <button type="button" className={SMALL_BUTTON_CLASS} onClick={runAll} disabled={evaluateAll.isPending}>
                Re-evaluate ungraded submissions
              </button>
            )}
            <button type="button" className={SMALL_BUTTON_CLASS} onClick={() => setShowSynonyms((s) => !s)} aria-expanded={showSynonyms}>
              Shared synonym dictionary
            </button>
            {rubric && (
              <button type="button" className={`${SMALL_BUTTON_CLASS} text-red-600 dark:text-red-400`} onClick={remove} disabled={deleteMutation.isPending}>
                <Trash2 size={12} /> Remove auto-evaluation
              </button>
            )}
          </div>
        </form>
      )}
      {/* Outside the form: pressing Enter here must not save the marking scheme. */}
      {open && showSynonyms && <SynonymDictionary />}
    </div>
  );
}

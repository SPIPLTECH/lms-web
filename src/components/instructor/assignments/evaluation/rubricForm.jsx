"use client";

import { Plus, Trash2 } from "lucide-react";

import { Field, INPUT_CLASS, SMALL_BUTTON_CLASS, fmtMarks, splitComma, splitLines } from "./evaluationUi";

/**
 * The marking-scheme fields, shared by the assignment page (Auto-evaluation)
 * and the dialogs that create an assignment, so a scheme can be written
 * while the assignment is created or at any time afterwards.
 *
 * The scheme's total marks are the assignment's marks (saving sets both), so
 * they are whole numbers. Evaluated marks are only ever suggestions: nothing
 * reaches a student until an instructor approves or sets the marks.
 */

const emptyCriterion = () => ({ description: "", marks: "1", keywords: "", phrases: "", contradictions: "", minKeywords: "" });

/** Form state from a saved scheme (or a fresh one). */
export function toForm(rubric, assignmentMarks) {
  if (!rubric) {
    return {
      enabled: true,
      idealAnswer: "",
      maxMarks: String(assignmentMarks || 10),
      markStep: 0.5,
      keywords: "",
      synonyms: "",
      misconceptions: "",
      criteria: [],
    };
  }
  return {
    enabled: rubric.enabled,
    idealAnswer: rubric.idealAnswer,
    maxMarks: String(rubric.maxMarks),
    markStep: rubric.markStep,
    keywords: (rubric.keywords || []).join(", "),
    synonyms: (Array.isArray(rubric.synonyms) ? rubric.synonyms : []).map((g) => g.join(", ")).join("\n"),
    misconceptions: (rubric.misconceptions || []).join("\n"),
    criteria: (rubric.criteria || []).map((c) => ({
      description: c.description,
      marks: String(c.marks),
      keywords: (c.keywords || []).join(", "),
      phrases: (c.phrases || []).join("\n"),
      contradictions: (c.contradictions || []).join("\n"),
      minKeywords: c.minKeywords ? String(c.minKeywords) : "",
    })),
  };
}

/** The body PUT /assignments/:id/rubric expects. */
export function toPayload(form) {
  return {
    enabled: form.enabled,
    idealAnswer: form.idealAnswer.trim(),
    maxMarks: Number(form.maxMarks),
    markStep: Number(form.markStep),
    keywords: splitComma(form.keywords),
    synonyms: splitLines(form.synonyms).map(splitComma).filter((g) => g.length >= 2),
    misconceptions: splitLines(form.misconceptions),
    criteria: form.criteria.map((c) => ({
      description: c.description.trim(),
      marks: Number(c.marks),
      keywords: splitComma(c.keywords),
      phrases: splitLines(c.phrases),
      contradictions: splitLines(c.contradictions),
      minKeywords: c.minKeywords ? Number(c.minKeywords) : null,
    })),
  };
}

const onStep = (value, step) => Math.abs(value / step - Math.round(value / step)) < 1e-6;

/**
 * The server's own rules, checked before anything is saved, so a create
 * dialog never makes an assignment and then fails on its marking scheme.
 * Returns the first problem, or null.
 */
export function checkRubricForm(form) {
  const p = toPayload(form);
  if (!p.idealAnswer) return "Write the ideal answer.";
  if (!Number.isInteger(p.maxMarks) || p.maxMarks < 1 || p.maxMarks > 1000) {
    return "Total marks must be a whole number from 1 to 1000 (they are the assignment's marks).";
  }
  for (let i = 0; i < p.criteria.length; i += 1) {
    const c = p.criteria[i];
    const n = `Criterion ${i + 1}`;
    if (!c.description) return `${n}: say what earns the marks.`;
    if (!(c.marks > 0) || !onStep(c.marks, p.markStep)) return `${n}: marks must be more than 0, in steps of ${p.markStep}.`;
    if (!c.keywords.length && !c.phrases.length) return `${n}: add at least one keyword or key phrase.`;
    if (c.minKeywords && c.minKeywords > c.keywords.length) return `${n}: "Min keywords" is more than the number of keywords.`;
  }
  if (p.criteria.length) {
    const total = p.criteria.reduce((s, c) => s + c.marks, 0);
    if (Math.abs(total - p.maxMarks) > 1e-9) return `The criteria add up to ${fmtMarks(total)} but the maximum is ${fmtMarks(p.maxMarks)}.`;
  }
  return null;
}

function CriterionEditor({ index, criterion, onChange, onRemove }) {
  const set = (key) => (e) => onChange({ ...criterion, [key]: e.target.value });
  return (
    <fieldset className="space-y-2 rounded-lg border border-border bg-background/60 p-3">
      <legend className="px-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        Criterion {index + 1}
      </legend>
      <div className="grid gap-2 sm:grid-cols-[1fr_90px_110px]">
        <Field label="What earns the marks">
          <input className={INPUT_CLASS} value={criterion.description} onChange={set("description")} placeholder="e.g. Chlorophyll absorbs light energy" />
        </Field>
        <Field label="Marks">
          <input className={INPUT_CLASS} type="number" min="0" step="0.25" value={criterion.marks} onChange={set("marks")} />
        </Field>
        <Field label="Min keywords" hint="(blank = all)">
          <input className={INPUT_CLASS} type="number" min="1" value={criterion.minKeywords} onChange={set("minKeywords")} />
        </Field>
      </div>
      <Field label="Keywords" hint="(comma separated)">
        <input className={INPUT_CLASS} value={criterion.keywords} onChange={set("keywords")} placeholder="chlorophyll, absorb, light" />
      </Field>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Key phrases" hint="(one per line)">
          <textarea className={`${INPUT_CLASS} resize-y`} rows={2} value={criterion.phrases} onChange={set("phrases")} />
        </Field>
        <Field label="Contradicting statements" hint="(one per line; gives 0 for this criterion)">
          <textarea className={`${INPUT_CLASS} resize-y`} rows={2} value={criterion.contradictions} onChange={set("contradictions")} />
        </Field>
      </div>
      <button type="button" onClick={onRemove} className={`${SMALL_BUTTON_CLASS} text-red-600 dark:text-red-400`}>
        <Trash2 size={12} /> Remove criterion
      </button>
    </fieldset>
  );
}

/**
 * Every marking-scheme field. Controlled: the caller owns `form`.
 * `assignmentMarks`: the assignment's current marks, to say when saving
 * would change them (omit when the caller enforces equality itself).
 */
export function RubricFields({ form, setForm, assignmentMarks = null }) {
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const criteriaTotal = form.criteria.reduce((s, c) => s + (Number(c.marks) || 0), 0);
  const totalOk = Math.abs(criteriaTotal - Number(form.maxMarks)) < 1e-9;
  const changesAssignmentMarks =
    assignmentMarks !== null && assignmentMarks !== undefined && form.maxMarks !== "" && Number(form.maxMarks) !== Number(assignmentMarks);

  return (
    <div className="space-y-3">
      <label className="inline-flex items-center gap-2 text-[11px] font-bold text-foreground">
        <input type="checkbox" checked={form.enabled} onChange={set("enabled")} /> Auto-evaluate new submissions
      </label>
      <p className="text-[11px] text-muted-foreground">
        Suggested marks are never shown to students. Each one waits for you to approve it or set different marks.
      </p>

      <Field label="Ideal answer" hint="(never shown to students)">
        <textarea className={`${INPUT_CLASS} resize-y`} rows={4} value={form.idealAnswer} onChange={set("idealAnswer")} />
      </Field>
      <div className="grid gap-2 sm:grid-cols-3">
        <Field label="Total marks" hint="(the assignment's marks)">
          <input className={INPUT_CLASS} type="number" min="1" max="1000" step="1" value={form.maxMarks} onChange={set("maxMarks")} />
        </Field>
        <Field label="Mark step">
          <select className={INPUT_CLASS} value={form.markStep} onChange={(e) => setForm({ ...form, markStep: Number(e.target.value) })}>
            <option value={0.25}>0.25</option>
            <option value={0.5}>0.5</option>
            <option value={1}>1</option>
          </select>
        </Field>
        <Field label="Keywords" hint="(only used without criteria)">
          <input className={INPUT_CLASS} value={form.keywords} onChange={set("keywords")} />
        </Field>
      </div>
      {changesAssignmentMarks && (
        <p role="status" className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
          Saving changes this assignment&apos;s marks from {fmtMarks(Number(assignmentMarks))} to {form.maxMarks}.
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Synonyms for this assignment" hint="(one group per line, comma separated)">
          <textarea className={`${INPUT_CLASS} resize-y`} rows={2} value={form.synonyms} onChange={set("synonyms")} placeholder="light, sunlight" />
        </Field>
        <Field label="Common misconceptions" hint="(one per line; sent to you for review)">
          <textarea className={`${INPUT_CLASS} resize-y`} rows={2} value={form.misconceptions} onChange={set("misconceptions")} />
        </Field>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-bold text-foreground">Marking criteria</p>
        {form.criteria.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">
            No criteria: one is made from each sentence of the ideal answer. Results are less reliable, so write criteria for real use.
          </p>
        ) : (
          <p className={`text-[11px] font-semibold ${totalOk ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            Criteria total {fmtMarks(criteriaTotal)} of {form.maxMarks} marks{totalOk ? "" : " — they must add up to the maximum."}
          </p>
        )}
        {form.criteria.map((c, i) => (
          <CriterionEditor
            key={i}
            index={i}
            criterion={c}
            onChange={(nc) => setForm({ ...form, criteria: form.criteria.map((x, j) => (j === i ? nc : x)) })}
            onRemove={() => setForm({ ...form, criteria: form.criteria.filter((_, j) => j !== i) })}
          />
        ))}
        <button type="button" className={SMALL_BUTTON_CLASS} onClick={() => setForm({ ...form, criteria: [...form.criteria, emptyCriterion()] })}>
          <Plus size={12} /> Add criterion
        </button>
      </div>
    </div>
  );
}

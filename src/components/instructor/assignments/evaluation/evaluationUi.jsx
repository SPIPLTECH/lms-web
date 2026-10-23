"use client";

import { cloneElement, useId } from "react";

import { evaluationStatusMeta } from "@/lib/assignmentEvaluationState";

/** Same look as the grade form's inputs in AssignmentSubmissionsPanel. */
export const INPUT_CLASS =
  "w-full min-h-[36px] rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary disabled:opacity-60";

export const SMALL_BUTTON_CLASS =
  "min-h-[36px] inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[11px] font-bold text-foreground transition cursor-pointer hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed";

export const PRIMARY_BUTTON_CLASS =
  "min-h-[36px] inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-[11px] font-black uppercase tracking-wider text-slate-950 transition cursor-pointer hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed";

/** Label wired to its control by id, so screen readers announce it. */
export function Field({ label, hint, children, className = "" }) {
  const id = useId();
  return (
    <div className={`space-y-1 ${className}`}>
      <label htmlFor={id} className="block text-[11px] font-bold text-foreground">
        {label}
        {hint && <span className="font-semibold text-muted-foreground"> {hint}</span>}
      </label>
      {cloneElement(children, { id })}
    </div>
  );
}

export const fmtMarks = (n) =>
  n === null || n === undefined ? "–" : Number.isInteger(n) ? String(n) : String(Number(Number(n).toFixed(2)));

const TONES = {
  ok: "border-emerald-600/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  warn: "border-amber-600/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  bad: "border-red-600/30 bg-red-500/10 text-red-700 dark:text-red-400",
  info: "border-sky-600/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  muted: "border-border bg-background text-muted-foreground",
};

export function Pill({ tone = "muted", children, title }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-black ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

// Marks are shown next to these statuses: the proposal's or the published ones.
const SHOWS_MARKS = new Set(["ready", "needs-review", "outdated", "published"]);

/** Status of a submission's evaluation, with the proposed (or published) marks. */
export function EvaluationStatusBadge({ evaluation }) {
  if (!evaluation) return <span className="text-[10px] font-semibold text-muted-foreground">—</span>;
  const { label, tone, description } = evaluationStatusMeta(evaluation.status);
  const showMarks =
    SHOWS_MARKS.has(evaluation.status) && evaluation.marksAwarded !== null && evaluation.marksAwarded !== undefined;
  return (
    <Pill tone={tone} title={description}>
      {label}
      {showMarks && ` · ${fmtMarks(evaluation.marksAwarded)}/${fmtMarks(evaluation.maxMarks)}`}
    </Pill>
  );
}

export function ConfidencePill({ value }) {
  if (value === null || value === undefined) return null;
  const tone = value >= 0.8 ? "ok" : value >= 0.6 ? "warn" : "bad";
  return (
    <Pill tone={tone} title="How sure the evaluator is about these marks">
      {Math.round(value * 100)}% confident
    </Pill>
  );
}

const MATCH_TONE = {
  exact: "ok", synonym: "ok", proximity: "warn", fuzzy: "warn", "fuzzy-proximity": "warn", contradicted: "bad", none: "muted",
};
const CRITERION_TONE = { met: "ok", partial: "warn", missing: "muted", contradicted: "bad" };
const FLAG_TEXT = {
  contradiction: "Contradiction",
  "order-mismatch": "Relationship may be reversed",
  "mixed-polarity": "States it both ways",
  "possible-paraphrase": "Possible paraphrase",
  "weak-context": "Keywords without context",
  "spelling-tolerance": "Spelling tolerated",
  partial: "Partial evidence",
};

/** Why each criterion got its marks: matched keywords, flags, contradictions. */
export function CriteriaEvidence({ result }) {
  if (!result) return null;
  if (result.failed) {
    return <p className="text-[11px] font-semibold text-red-600 dark:text-red-400">Automatic evaluation failed: {result.error}</p>;
  }
  const criteria = Array.isArray(result.criteria) ? result.criteria : [];
  return (
    <ul className="space-y-2">
      {(result.misconceptions || []).length > 0 && (
        <li className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
          Misconception matched: {result.misconceptions.map((m) => `“${m.found}”`).join(", ")}
        </li>
      )}
      {criteria.map((c, i) => (
        <li key={c.criterionId || i} className="space-y-1.5 rounded-lg border border-border bg-background/60 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="min-w-0 flex-1 text-xs font-bold text-foreground">{c.description}</p>
            <Pill tone={CRITERION_TONE[c.status] || "muted"}>{c.status}</Pill>
            {c.overridden && <Pill tone="info">set by instructor</Pill>}
            <span className="font-mono text-xs font-black text-foreground">
              {fmtMarks(c.awarded)}/{fmtMarks(c.maxMarks)}
            </span>
          </div>
          {c.autoGenerated && c.referenceText && (
            <p className="text-[10px] text-muted-foreground">From the ideal answer: {c.referenceText}</p>
          )}
          {c.evidence && (
            <>
              <div className="flex flex-wrap gap-1">
                {c.evidence.keywords.map((k) => (
                  <Pill key={k.keyword} tone={MATCH_TONE[k.matchType] || "muted"} title={k.matchedText ? `Found: ${k.matchedText}` : "Not found"}>
                    {k.keyword}: {k.matchType}
                  </Pill>
                ))}
              </div>
              {c.flags && c.flags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {c.flags.map((f) => (
                    <Pill key={f} tone="warn">{FLAG_TEXT[f] || f}</Pill>
                  ))}
                </div>
              )}
              {(c.contradictions || []).map((x, j) => (
                <p key={j} className="text-[11px] font-semibold text-red-600 dark:text-red-400">
                  {x.type === "misconception" ? `Misconception: “${x.found}”` : `Contradicts the point: “${x.found}”`}
                </p>
              ))}
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

export const splitComma = (s) => s.split(",").map((x) => x.trim()).filter(Boolean);
export const splitLines = (s) => s.split("\n").map((x) => x.trim()).filter(Boolean);

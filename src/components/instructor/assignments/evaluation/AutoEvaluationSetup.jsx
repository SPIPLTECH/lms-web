"use client";

import { saveRubric } from "@/services/assignmentEvaluation.service";
import { RubricFields, checkRubricForm, toForm, toPayload } from "./rubricForm";

/**
 * Optional auto-evaluation settings inside a "create assignment" dialog.
 * `value` is the marking-scheme form, or null while switched off. The scheme
 * can also be added or changed later from the assignment page.
 */
export default function AutoEvaluationSetup({ value, onChange, defaultMarks = 10 }) {
  const on = Boolean(value);
  return (
    <section aria-label="Auto-evaluation" className="space-y-3 rounded-lg border border-border bg-background/40 p-3">
      <label className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
        <input
          type="checkbox"
          checked={on}
          onChange={(e) => onChange(e.target.checked ? toForm(null, defaultMarks) : null)}
        />
        Auto-evaluation <span className="font-normal text-muted-foreground">(optional)</span>
      </label>
      <p className="text-xs text-muted-foreground">
        The LMS suggests marks for typed and PDF answers from your ideal answer and marking criteria. Students see marks only
        after you approve them. The total marks here are the assignment&apos;s marks. You can also set this up later from the
        assignment page (Grading &amp; Results), where you can try sample answers.
      </p>
      {on && <RubricFields form={value} setForm={onChange} />}
    </section>
  );
}

/** Null when the settings are off or valid; otherwise the first problem to show. */
export function checkAutoEvaluationSetup(value) {
  return value ? checkRubricForm(value) : null;
}

/**
 * Saves the scheme for a just-created assignment. Returns an error message
 * instead of throwing: the assignment itself already exists at this point.
 */
export async function saveAutoEvaluationSetup(assignmentId, value) {
  if (!value) return null;
  if (!assignmentId) return "The assignment was created, but its auto-evaluation settings could not be attached.";
  try {
    await saveRubric(assignmentId, toPayload(value));
    return null;
  } catch (error) {
    const reason = error?.response?.data?.message || "please try again";
    return `The assignment was created, but its auto-evaluation settings were not saved (${reason}). Add them from the assignment page.`;
  }
}

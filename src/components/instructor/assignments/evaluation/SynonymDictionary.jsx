"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { useToast } from "@/components/ui/ToastProvider";
import { useSynonymGroups, useSynonymMutations } from "@/hooks/queries/instructor/useAssignmentEvaluation";
import { Field, INPUT_CLASS, Pill, SMALL_BUTTON_CLASS, splitComma } from "./evaluationUi";

/**
 * Synonyms every assignment's evaluator uses ("co2" = "carbon dioxide").
 * Keep groups strict: a loose synonym awards marks for the wrong idea.
 */
export default function SynonymDictionary() {
  const { data: groups = [], isLoading } = useSynonymGroups();
  const { add, addStarter, remove } = useSynonymMutations();
  const { showToast } = useToast();
  const [terms, setTerms] = useState("");

  const onError = (fallback) => (error) => showToast(error?.response?.data?.message || fallback, "error");

  const submit = () => {
    add.mutate(
      { terms: splitComma(terms) },
      { onSuccess: () => setTerms(""), onError: onError("Could not add the synonym group.") }
    );
  };

  return (
    <div className="space-y-2 rounded-lg border border-border bg-background/60 p-3">
      <p className="text-[11px] text-muted-foreground">
        Terms in a group count as the same idea in every assignment. Keep groups strict: a loose synonym gives marks for the wrong concept.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Field label="New group" hint="(comma separated, at least two terms)" className="flex-1">
          <input className={INPUT_CLASS} value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="carbon dioxide, co2" />
        </Field>
        <button type="button" className={SMALL_BUTTON_CLASS} onClick={submit} disabled={add.isPending || splitComma(terms).length < 2}>
          Add group
        </button>
        <button
          type="button"
          className={SMALL_BUTTON_CLASS}
          disabled={addStarter.isPending}
          onClick={() => addStarter.mutate(undefined, {
            onSuccess: (r) => showToast(`Added ${r.added} starter group(s).`, "success"),
            onError: onError("Could not add the starter groups."),
          })}
        >
          Add starter science groups
        </button>
      </div>
      {isLoading ? (
        <p className="text-[11px] text-muted-foreground">Loading…</p>
      ) : groups.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">No shared synonyms yet.</p>
      ) : (
        <ul className="space-y-1">
          {groups.map((g) => (
            <li key={g.id} className="flex items-center gap-2">
              <div className="flex flex-1 flex-wrap gap-1">
                {g.terms.map((t) => <Pill key={t}>{t}</Pill>)}
              </div>
              <button
                type="button"
                className="text-muted-foreground transition hover:text-red-400 cursor-pointer"
                aria-label={`Delete synonym group ${g.terms.join(", ")}`}
                onClick={() => remove.mutate(g.id, { onError: onError("Could not delete the group.") })}
              >
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

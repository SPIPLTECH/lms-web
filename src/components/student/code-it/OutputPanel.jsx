"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import Loader from "@/components/common/Loader";

const STATUS_LABEL = {
  ok: null,
  compile_error: "Compilation error",
  runtime_error: "Runtime error",
  timeout: "Time limit exceeded",
  error: "Could not run",
};

/**
 * Output / Expected / Hints tabs under the editor.
 * `result` is a RunResult; `verdict` is set after Submit: {passed}.
 * `expected` and `hints` exist only in the Lab.
 * `fill`: stretch to the parent's height instead of capping the body at 320px.
 */
export default function OutputPanel({ result, verdict, pending, error, expected, hints, fill = false }) {
  const tabs = [
    { id: "output", label: "Output" },
    ...(expected !== undefined ? [{ id: "expected", label: "Expected" }] : []),
    ...(hints?.length ? [{ id: "hints", label: `Hints (${hints.length})` }] : []),
  ];
  const [tab, setTab] = useState("output");

  return (
    <div className={`rounded-xl border border-border bg-card overflow-hidden ${fill ? "flex h-full flex-col" : ""}`}>
      <div className="flex shrink-0 gap-1 border-b border-border px-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-xs font-semibold border-b-2 -mb-px transition cursor-pointer ${
              tab === t.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={`p-3 min-h-[120px] overflow-auto text-sm ${fill ? "flex-1" : "max-h-[320px]"}`}>
        {tab === "output" && <OutputBody result={result} verdict={verdict} pending={pending} error={error} />}
        {tab === "expected" && <pre className="font-mono text-xs whitespace-pre-wrap text-foreground">{expected || "(no output)"}</pre>}
        {tab === "hints" && (
          <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
            {hints.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function OutputBody({ result, verdict, pending, error }) {
  if (pending) {
    return (
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader /> <span className="text-xs">Compiling and running…</span>
      </div>
    );
  }
  if (error) {
    return (
      <p className="flex items-start gap-2 text-destructive text-xs">
        <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {error}
      </p>
    );
  }
  if (!result) return <p className="text-xs text-muted-foreground">Run your code to see the output here.</p>;

  const problem = STATUS_LABEL[result.status];
  return (
    <div className="space-y-3">
      {verdict && (
        <p className={`flex items-center gap-2 text-sm font-semibold ${verdict.passed ? "text-success" : "text-destructive"}`}>
          {verdict.passed ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {verdict.passed ? "Solved! All three checks passed." : "Not solved yet — see the Code Analysis below."}
        </p>
      )}
      {problem && (
        <p className="flex items-center gap-2 text-xs font-semibold text-destructive">
          <AlertTriangle size={14} /> {problem}
          {result.message ? ` — ${result.message}` : ""}
        </p>
      )}
      {result.compileOutput && result.status === "compile_error" && (
        <pre className="font-mono text-xs whitespace-pre-wrap text-destructive">{result.compileOutput}</pre>
      )}
      {result.status !== "compile_error" && (
        <pre className="font-mono text-xs whitespace-pre-wrap text-foreground">{result.stdout || "(no output)"}</pre>
      )}
      {result.stderr && <pre className="font-mono text-xs whitespace-pre-wrap text-destructive">{result.stderr}</pre>}
      {typeof result.timeMs === "number" && (
        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock size={12} /> {result.timeMs} ms
        </p>
      )}
    </div>
  );
}

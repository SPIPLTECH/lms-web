"use client";

import { CheckCircle2, AlertCircle, XCircle, MinusCircle, ScanSearch } from "lucide-react";

const ROWS = [
  { key: "syntax", title: "Syntax Check", question: "Is the code valid?" },
  { key: "output", title: "Output Check", question: "Is the result correct?" },
  { key: "concept", title: "Concept Check", question: "Did you use the intended concept?" },
];

const STATUS = {
  pass: { icon: CheckCircle2, className: "text-success" },
  warn: { icon: AlertCircle, className: "text-warning" },
  fail: { icon: XCircle, className: "text-destructive" },
  skip: { icon: MinusCircle, className: "text-muted-foreground" },
};

/**
 * The three Lab checks returned by code-it-service after Run / Submit:
 * syntax, output, concept — each pass / warn / fail / skip with a message.
 * An exercise counts as solved only when all three pass.
 */
export default function CodeAnalysis({ checks }) {
  if (!checks) return null;

  return (
    <div className="rounded-xl border border-border bg-card">
      <p className="flex items-center gap-1.5 border-b border-border px-3 py-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
        <ScanSearch size={13} /> Code Analysis
      </p>
      <ul className="divide-y divide-border">
        {ROWS.map(({ key, title, question }) => {
          const check = checks[key];
          if (!check) return null;
          const { icon: Icon, className } = STATUS[check.status] ?? STATUS.skip;
          return (
            <li key={key} className="flex gap-2.5 px-3 py-2">
              <Icon size={16} className={`mt-0.5 shrink-0 ${className}`} />
              <div className="min-w-0 text-xs">
                <p className="font-semibold text-foreground">
                  {title} <span className="font-normal italic text-muted-foreground">— {question}</span>
                </p>
                <p className={`mt-0.5 ${className}`}>{check.message}</p>
                {check.details?.length > 0 && (
                  <ul className="mt-0.5 list-disc pl-4 text-muted-foreground">
                    {check.details.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

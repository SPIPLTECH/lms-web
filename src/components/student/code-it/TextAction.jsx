"use client";

import { Loader2 } from "lucide-react";

const TONES = {
  default: "text-muted-foreground hover:text-foreground hover:bg-primary/10",
  primary: "text-primary hover:bg-primary/10",
  success: "text-success hover:bg-success/10",
  // A bordered, tinted button — for the one action that opens something (Ask AI).
  button: "border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20",
};

/**
 * Text-only action in Code-IT's editor bar (Run, Submit, Reset, …) — styled
 * like the language tabs rather than as a boxed button, so the bar stays light.
 * `tone="button"` gives the boxed look for the action that should stand out.
 */
export default function TextAction({ icon: Icon, children, onClick, disabled = false, loading = false, tone = "default", title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${TONES[tone]}`}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : Icon && <Icon size={14} />}
      {children}
    </button>
  );
}

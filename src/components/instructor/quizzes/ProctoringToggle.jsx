"use client";

import { Lock, ShieldCheck } from "lucide-react";

import { useProctoringConfig } from "@/hooks/queries/instructor/useProctoringConfig";

/**
 * The proctoring checkbox, shared by the Course Composer and QuizForm. The server
 * enforces every rule here; this only keeps the form honest about them.
 *
 * Hidden while the feature is off, unless the quiz already has it ticked. Callers
 * render it only for a graded quiz, so it never appears on a Self-Test.
 */
export default function ProctoringToggle({ checked, locked = false, onChange }) {
    const { data: config } = useProctoringConfig();

    if (!config?.available && !checked) return null;

    if (locked) {
        return (
            <div className="flex items-start gap-2 rounded-xl border border-border bg-background p-2.5 text-[12.5px] text-muted-foreground">
                <Lock size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>
                    Proctoring is {checked ? "on" : "off"} and locked because a student has started this quiz.
                </span>
            </div>
        );
    }

    return (
        <label className="flex items-start gap-2 rounded-xl border border-border bg-background p-2.5 cursor-pointer">
            <input
                type="checkbox"
                checked={Boolean(checked)}
                onChange={(e) => onChange?.(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-emerald-500"
            />
            <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-foreground">
                    <ShieldCheck size={14} aria-hidden="true" />
                    Enable proctoring for this quiz
                </span>
                <span className="mt-0.5 block text-[12px] leading-snug text-muted-foreground">
                    Students must pass a camera and identity check, and are monitored by webcam and browser during the quiz. Needs a time limit. Can&apos;t be changed after the first student starts.
                </span>
            </span>
        </label>
    );
}

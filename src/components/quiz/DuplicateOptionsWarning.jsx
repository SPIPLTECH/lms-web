"use client";

import { AlertTriangle } from "lucide-react";

import { findLooselyDuplicateOptions } from "@/lib/quizAnswers";

/**
 * Warns, while a question is being written, when two of its plain options
 * would count as the same answer (identical, or differing only by spaces), since a
 * student picking either could not be told apart. Code options are compared
 * exactly and never trigger it. Renders nothing when the options are fine.
 */
export default function DuplicateOptionsWarning({ options = [] }) {
  const pair = findLooselyDuplicateOptions(options);
  if (!pair) return null;
  const [first, second] = pair.map((index) => String.fromCharCode(65 + index));

  return (
    <p className="flex items-start gap-1.5 rounded-lg border border-warning/30 bg-warning/10 px-2.5 py-1.5 text-[12.5px] text-warning">
      <AlertTriangle size={14} className="mt-px shrink-0" aria-hidden />
      Options {first} and {second} are the same once extra spaces are ignored, so they count as one
      answer. Make them different, or put code in a code block, where spacing counts.
    </p>
  );
}

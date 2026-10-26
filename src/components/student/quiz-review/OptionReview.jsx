"use client";

import { Check, X } from "lucide-react";

import { isCorrectOption } from "@/lib/quizAnswers";

const optionText = (opt) => {
  if (opt === null || opt === undefined) return "";
  if (typeof opt === "object") return String(opt.optionText ?? opt.text ?? "");
  return String(opt);
};

const optionReason = (opt) =>
  opt && typeof opt === "object" && typeof opt.explanation === "string" ? opt.explanation.trim() : "";

const isOptionCorrect = (opt, correctAnswer) =>
  isCorrectOption(optionText(opt), correctAnswer) || (opt && typeof opt === "object" && opt.isCorrect === true);

/**
 * Whether the question's own explanation is shown inside its correct
 * option's card. Only when exactly one option is correct — a multi-answer
 * question's explanation covers several options, so it stays a block of its
 * own, which the caller renders.
 */
export function explanationInsideOption(options = [], correctAnswer) {
  return options.filter((opt) => isOptionCorrect(opt, correctAnswer)).length === 1;
}

/**
 * A choice question's options once the answer is known — the Self-Test after
 * "Check Answer", and the result page. Each option is one card: the correct
 * one green with "Why it's correct" (the question's explanation), the
 * student's wrong pick red, and every wrong option with its own "Why it's
 * wrong" when the instructor wrote one.
 *
 * `options` are in the order the student saw them, so the letters match.
 */
export default function OptionReview({ options = [], selectedAnswer, correctAnswer, explanation }) {
  const picked = (text) =>
    Array.isArray(selectedAnswer) ? selectedAnswer.map(String).includes(text) : String(selectedAnswer ?? "") === text;
  const whyCorrect = typeof explanation === "string" ? explanation.trim() : "";
  const showWhyCorrect = Boolean(whyCorrect) && explanationInsideOption(options, correctAnswer);

  return (
    <ul className="space-y-2 sm:space-y-2.5">
      {options.map((opt, index) => {
        const text = optionText(opt);
        const isCorrect = isOptionCorrect(opt, correctAnswer);
        const isPicked = picked(text);
        const state = isCorrect ? "correct" : isPicked ? "wrong" : "other";
        const reason = isCorrect ? (showWhyCorrect ? whyCorrect : "") : optionReason(opt);

        return (
          <li
            key={`${index}-${text}`}
            className={`rounded-xl border ${
              state === "correct"
                ? "border-emerald-500/50 bg-emerald-500/[0.08]"
                : state === "wrong"
                  ? "border-rose-500/50 bg-rose-500/[0.08]"
                  : "border-border bg-background/60"
            }`}
          >
            <div className="flex items-center gap-2.5 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold sm:h-7 sm:w-7 sm:text-sm ${
                  state === "correct"
                    ? "bg-emerald-600 text-white"
                    : state === "wrong"
                      ? "bg-rose-600 text-white"
                      : "bg-muted text-muted-foreground"
                }`}
                aria-hidden
              >
                {String.fromCharCode(65 + index)}
              </span>
              <span
                className={`min-w-0 flex-1 break-words text-sm leading-snug sm:text-base ${
                  state === "other" ? "text-foreground" : "font-semibold text-foreground"
                }`}
              >
                {text}
              </span>
              {state === "correct" && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 sm:text-xs">
                  <Check size={13} aria-hidden />
                  {isPicked ? "Correct · your answer" : "Correct answer"}
                </span>
              )}
              {state === "wrong" && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[11px] font-bold text-rose-700 dark:text-rose-300 sm:text-xs">
                  <X size={13} aria-hidden />
                  Your answer
                </span>
              )}
            </div>

            {reason && (
              <div
                className={`border-t px-3 pb-3 pt-2.5 sm:px-4 sm:pb-3.5 ${
                  state === "correct"
                    ? "border-emerald-500/25"
                    : state === "wrong"
                      ? "border-rose-500/25"
                      : "border-border"
                }`}
              >
                <p
                  className={`flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider ${
                    state === "correct"
                      ? "text-emerald-700 dark:text-emerald-300"
                      : state === "wrong"
                        ? "text-rose-700 dark:text-rose-300"
                        : "text-muted-foreground"
                  }`}
                >
                  {state === "correct" ? <Check size={12} aria-hidden /> : <X size={12} aria-hidden />}
                  {state === "correct" ? "Why it's correct" : "Why it's wrong"}
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/85">{reason}</p>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

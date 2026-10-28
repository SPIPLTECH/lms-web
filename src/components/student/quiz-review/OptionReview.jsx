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
    <ul className="space-y-1.5 sm:space-y-2">
      {options.map((opt, index) => {
        const text = optionText(opt);
        const isCorrect = isOptionCorrect(opt, correctAnswer);
        const isPicked = picked(text);
        const state = isCorrect ? "correct" : isPicked ? "wrong" : "other";
        const reason = isCorrect ? (showWhyCorrect ? whyCorrect : "") : optionReason(opt);

        return (
          <li
            key={`${index}-${text}`}
            className={`rounded-lg sm:rounded-xl border ${
              state === "correct"
                ? "border-emerald-500/50 bg-emerald-500/[0.08]"
                : state === "wrong"
                  ? "border-rose-500/50 bg-rose-500/[0.08]"
                  : "border-border bg-background/60"
            }`}
          >
            <div className="flex items-center gap-2 px-2.5 py-1.5 sm:gap-2.5 sm:px-3 sm:py-2">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-extrabold sm:h-5.5 sm:w-5.5 sm:text-xs ${
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
                className={`min-w-0 flex-1 break-words text-xs leading-snug sm:text-sm ${
                  state === "other" ? "text-foreground" : "font-semibold text-foreground"
                }`}
              >
                {text}
              </span>
              {state === "correct" && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 sm:text-[11px]">
                  <Check size={11} aria-hidden />
                  {isPicked ? "Correct · your answer" : "Correct answer"}
                </span>
              )}
              {state === "wrong" && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-300 sm:text-[11px]">
                  <X size={11} aria-hidden />
                  Your answer
                </span>
              )}
            </div>

            {/* The reason sits under the option's text — indented past the
                letter badge (padding + badge + gap: 10+20+8px, 12+22+10px
                from sm) — with its label on a line of its own. A label column
                beside the text left the reason ~half the card's width on a
                phone, so every option wrapped into a tall narrow block. No
                band or divider of its own: the card already frames it. An
                option the student neither picked nor should have is muted,
                so the correct one and their own pick lead. */}
            {reason && (
              <div className="pb-2 pl-[38px] pr-2.5 sm:pb-2.5 sm:pl-[44px] sm:pr-3">
                <p
                  className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider sm:text-[10.5px] ${
                    state === "correct"
                      ? "text-emerald-700 dark:text-emerald-300"
                      : state === "wrong"
                        ? "text-rose-700 dark:text-rose-300"
                        : "text-muted-foreground"
                  }`}
                >
                  {state === "correct" ? <Check size={11} aria-hidden /> : <X size={11} aria-hidden />}
                  {state === "correct" ? "Why it's correct" : "Why it's wrong"}
                </p>
                <p
                  className={`mt-0.5 break-words text-xs leading-relaxed sm:text-[13px] ${
                    state === "other" ? "text-muted-foreground" : "text-foreground/85"
                  }`}
                >
                  {reason}
                </p>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

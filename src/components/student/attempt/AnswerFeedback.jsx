"use client";

import { CheckCircle2, Lock, XCircle } from "lucide-react";

import { checkAnswerCorrectness, isCorrectOption } from "@/lib/quizAnswers";
import { explanationInsideOption } from "@/components/student/quiz-review/OptionReview";

const getOptionText = (opt) => {
  if (opt === null || opt === undefined) return "";
  if (typeof opt === "object") return String(opt.optionText ?? opt.text ?? "");
  return String(opt);
};

const letterFor = (index) => String.fromCharCode(65 + index);

const joinLetters = (letters) =>
  letters.length <= 1 ? letters.join("") : `${letters.slice(0, -1).join(", ")} and ${letters[letters.length - 1]}`;

/**
 * The verdict under a checked Self-Test answer. For a choice question the
 * options themselves already show what is right and why (OptionReview), so
 * this adds only the one-line verdict and — when it is not already inside
 * the correct option's card — the explanation. Other question types get the
 * correct answer spelled out here, since their inputs have no checked look.
 *
 * `options` are the options exactly as shown on screen (shuffled), so "B"
 * here is the "B" the student sees.
 */
export default function AnswerFeedback({ question, type, options = [], selectedAnswer }) {
  const correctAnswer = question?.correctAnswer;
  const explanation = typeof question?.explanation === "string" ? question.explanation.trim() : "";
  const isChoice = type === "MCQ_SINGLE" || type === "MCQ_MULTI";
  // A written answer has no right or wrong to announce — it is compared
  // against the model answer by the student.
  const hasVerdict = type !== "SELF_ASSESSMENT";
  const isRight = hasVerdict && checkAnswerCorrectness(type, selectedAnswer, correctAnswer);

  const correctLetters = isChoice
    ? options.map((opt, i) => (isCorrectOption(getOptionText(opt), correctAnswer) ? letterFor(i) : null)).filter(Boolean)
    : [];
  const correctTexts = isChoice
    ? options.map(getOptionText).filter((text) => isCorrectOption(text, correctAnswer))
    : [];

  // The explanation is already in the correct option's card when there is
  // exactly one correct option; otherwise it is shown here.
  const showExplanation = Boolean(explanation) && !(isChoice && explanationInsideOption(options, correctAnswer));
  const explanationHeading =
    correctLetters.length > 1 ? `Why ${joinLetters(correctLetters)} are correct` : "Explanation";

  let missedMessage = "Not quite. The correct answer is shown below.";
  if (type === "MCQ_SINGLE" && correctLetters.length === 1) {
    missedMessage = `Not quite. The correct answer is ${correctLetters[0]}: ${correctTexts[0]}`;
  } else if (type === "MCQ_MULTI" && correctLetters.length > 0) {
    missedMessage = `Not quite. The correct answers are ${joinLetters(correctLetters)}.`;
  }

  return (
    <div className="mt-2.5 space-y-2 sm:mt-4 sm:space-y-2.5" aria-live="polite">
      {hasVerdict && (
        <div
          className={`flex items-start gap-2 rounded-xl border p-3 text-sm font-bold sm:p-3.5 ${
            isRight
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
              : "border-rose-500/40 bg-rose-500/10 text-rose-800 dark:text-rose-300"
          }`}
        >
          {isRight ? (
            <CheckCircle2 size={18} className="mt-px shrink-0" aria-hidden />
          ) : (
            <XCircle size={18} className="mt-px shrink-0" aria-hidden />
          )}
          <span className="break-words">{isRight ? "Correct! Well done." : missedMessage}</span>
        </div>
      )}

      {/* The answer itself, for the types whose inputs don't show it — and
          for a choice question whose key matches none of its options, where
          no option could be marked. */}
      {(!isChoice || correctLetters.length === 0) && correctAnswer !== undefined && correctAnswer !== null && correctAnswer !== "" && (
        <div className="rounded-xl border border-border bg-muted/40 p-3 sm:p-3.5 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
            {type === "SELF_ASSESSMENT"
              ? "Model answer"
              : type === "ARRANGE_TOKENS"
                ? "Correct order"
                : type === "MATCH_PAIRS"
                  ? "Correct matches"
                  : "Correct answer"}
          </span>
          {type === "ARRANGE_TOKENS" && Array.isArray(correctAnswer) ? (
            <p className="text-sm leading-relaxed text-foreground break-words">{correctAnswer.join("  →  ")}</p>
          ) : type === "MATCH_PAIRS" && typeof correctAnswer === "object" ? (
            <ul className="space-y-0.5 text-sm text-foreground">
              {Object.entries(correctAnswer).map(([left, right]) => (
                <li key={left} className="break-words">
                  {left} → <span className="font-semibold">{String(right)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
              {typeof correctAnswer === "string"
                ? correctAnswer
                : Array.isArray(correctAnswer)
                  ? correctAnswer.join(", ")
                  : JSON.stringify(correctAnswer)}
            </p>
          )}
        </div>
      )}

      {showExplanation && (
        <div className="rounded-xl border border-border bg-muted/40 p-3 sm:p-3.5 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-primary">{explanationHeading}</span>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">{explanation}</p>
        </div>
      )}

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Lock size={12} className="shrink-0" aria-hidden /> Your answer is locked for this question.
      </p>
    </div>
  );
}

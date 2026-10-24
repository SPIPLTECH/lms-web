"use client";

import { CheckCircle2, Lock, XCircle } from "lucide-react";

import { checkAnswerCorrectness, isCorrectOption } from "@/lib/quizAnswers";

const getOptionText = (opt) => {
  if (opt === null || opt === undefined) return "";
  if (typeof opt === "object") return String(opt.optionText ?? opt.text ?? "");
  return String(opt);
};

const letterFor = (index) => String.fromCharCode(65 + index);

const joinLetters = (letters) =>
  letters.length <= 1 ? letters.join("") : `${letters.slice(0, -1).join(", ")} and ${letters[letters.length - 1]}`;

/**
 * What a student sees once they check a Self-Test answer: whether it was
 * right, the correct answer, why it is correct, and — for choice questions —
 * why each other option is wrong. `options` are the options exactly as shown
 * on screen (shuffled), so "B" here is the "B" the student sees.
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

  // Why each wrong option is wrong — only those an instructor wrote a reason for.
  const wrongReasons = isChoice
    ? options
        .map((opt, i) => ({
          letter: letterFor(i),
          text: getOptionText(opt),
          reason: opt && typeof opt === "object" && typeof opt.explanation === "string" ? opt.explanation.trim() : "",
          isYours: Array.isArray(selectedAnswer)
            ? selectedAnswer.includes(getOptionText(opt))
            : selectedAnswer === getOptionText(opt),
        }))
        .filter((o) => o.reason && !isCorrectOption(o.text, correctAnswer))
    : [];

  const explanationHeading =
    correctLetters.length === 1
      ? `Why ${correctLetters[0]} is correct`
      : correctLetters.length > 1
        ? `Why ${joinLetters(correctLetters)} are correct`
        : "Explanation";

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
          className={`flex items-start gap-2 rounded-lg border p-2.5 text-xs font-bold sm:rounded-xl sm:p-3.5 sm:text-sm ${
            isRight
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
              : "border-rose-500/40 bg-rose-500/10 text-rose-800 dark:text-rose-300"
          }`}
        >
          {isRight ? (
            <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden />
          ) : (
            <XCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
          )}
          <span className="break-words">{isRight ? "Correct! Well done." : missedMessage}</span>
        </div>
      )}

      {/* The answer itself, for the types whose options don't already show it
          — and for a choice question whose key matches none of its options,
          where no option could be marked. */}
      {(!isChoice || correctLetters.length === 0) && correctAnswer !== undefined && correctAnswer !== null && correctAnswer !== "" && (
        <div className="rounded-lg border border-border bg-muted/40 p-2.5 sm:rounded-xl sm:p-3.5 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary sm:text-[11px]">
            {type === "SELF_ASSESSMENT"
              ? "Model answer"
              : type === "ARRANGE_TOKENS"
                ? "Correct order"
                : type === "MATCH_PAIRS"
                  ? "Correct matches"
                  : "Correct answer"}
          </span>
          {type === "ARRANGE_TOKENS" && Array.isArray(correctAnswer) ? (
            <p className="text-xs leading-relaxed text-foreground sm:text-sm break-words">{correctAnswer.join("  →  ")}</p>
          ) : type === "MATCH_PAIRS" && typeof correctAnswer === "object" ? (
            <ul className="space-y-0.5 text-xs text-foreground sm:text-sm">
              {Object.entries(correctAnswer).map(([left, right]) => (
                <li key={left} className="break-words">
                  {left} → <span className="font-semibold">{String(right)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground sm:text-sm">
              {typeof correctAnswer === "string"
                ? correctAnswer
                : Array.isArray(correctAnswer)
                  ? correctAnswer.join(", ")
                  : JSON.stringify(correctAnswer)}
            </p>
          )}
        </div>
      )}

      {explanation && (
        <div className="rounded-lg border border-border bg-muted/40 p-2.5 sm:rounded-xl sm:p-3.5 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary sm:text-[11px]">{explanationHeading}</span>
          <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground sm:text-sm">{explanation}</p>
        </div>
      )}

      {wrongReasons.length > 0 && (
        <div className="rounded-lg border border-border p-2.5 sm:rounded-xl sm:p-3.5 space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:text-[11px]">
            Why the other options are wrong
          </span>
          <ul className="space-y-2">
            {wrongReasons.map((o) => (
              <li key={o.letter} className="flex items-start gap-2">
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[11px] font-extrabold sm:h-6 sm:w-6 sm:text-xs ${
                    o.isYours ? "bg-rose-600 text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {o.letter}
                </span>
                <div className="min-w-0 space-y-0.5">
                  <p className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-foreground sm:text-sm">
                    <span className="break-words">{o.text}</span>
                    {o.isYours && (
                      <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-300">
                        Your answer
                      </span>
                    )}
                  </p>
                  <p className="break-words text-xs leading-relaxed text-muted-foreground sm:text-sm">{o.reason}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground sm:text-xs">
        <Lock size={12} className="shrink-0" aria-hidden /> Your answer is locked for this question.
      </p>
    </div>
  );
}

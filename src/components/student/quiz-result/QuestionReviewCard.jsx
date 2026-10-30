"use client";

import { ArrowRight, Check, CircleMinus, Minus, X } from "lucide-react";

import ListenButton from "@/components/student/tts/ListenButton";
import QuizRichText from "@/components/quiz/QuizRichText";
import OptionReview, { explanationInsideOption } from "@/components/student/quiz-review/OptionReview";
import { checkAnswerCorrectness } from "@/lib/quizAnswers";
import { resolveQuestionType, TRUE_FALSE_OPTIONS } from "@/lib/questionType";
import { buildAnswerReviewSpeech } from "@/lib/quizSpeech";

const hasAnswer = (value) =>
  Array.isArray(value)
    ? value.length > 0
    : value && typeof value === "object"
      ? Object.keys(value).length > 0
      : value !== undefined && value !== null && String(value).trim() !== "";

/**
 * What happened to one question in an attempt: "correct", "wrong" or
 * "skipped". The result page counts its filters with this too, so a tag and
 * the filter it falls under always agree.
 */
export function getQuestionReviewStatus(question, userAnswer) {
  const selected = userAnswer?.answer ?? userAnswer?.selectedOption;
  if (!hasAnswer(selected)) return "skipped";
  const qType = resolveQuestionType(question.questionType);
  return checkAnswerCorrectness(qType, selected, question.correctAnswer, question.options) ? "correct" : "wrong";
}

const STATUS_TAG = {
  correct: { label: "Correct", icon: Check, className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  wrong: { label: "Wrong", icon: X, className: "bg-red-500/10 text-red-700 dark:text-red-400" },
  skipped: { label: "Skipped", icon: Minus, className: "bg-muted text-muted-foreground" },
};

// One question in the result page's review list: its position and marks, what
// happened to it, the question text, the options (or the dedicated layout for
// ARRANGE_TOKENS / MATCH_PAIRS / SELF_ASSESSMENT) and the explanation, which
// carries the Listen control.
export default function QuestionReviewCard({ question, index, total, userAnswer }) {
  const qType = resolveQuestionType(question.questionType);
  const selectedOption = userAnswer?.answer ?? userAnswer?.selectedOption;
  const isCorrect = checkAnswerCorrectness(qType, selectedOption, question.correctAnswer, question.options);
  const status = getQuestionReviewStatus(question, userAnswer);
  const tag = STATUS_TAG[status];
  const TagIcon = tag.icon;
  const marks = question.marks || 1;

  const isChoice = qType === "MCQ_SINGLE" || qType === "MCQ_MULTI";

  // Format option text mapping
  let optionsList = [];
  if (isChoice) {
    if (typeof question.options === "string") {
      try {
        optionsList = JSON.parse(question.options);
      } catch {
        optionsList = [question.options];
      }
    } else if (Array.isArray(question.options)) {
      optionsList = question.options;
    }
    // A True/False question saved without its options still has them.
    if (optionsList.length === 0 && question.questionType === "TRUE_FALSE") {
      optionsList = TRUE_FALSE_OPTIONS;
    }
  }

  const explanation = typeof question.explanation === "string" ? question.explanation.trim() : "";
  // A single-answer choice question explains its correct option; anything
  // else gets a general explanation.
  const explanationTitle =
    isChoice && explanationInsideOption(optionsList, question.correctAnswer) ? "Why it's correct" : "Explanation";
  const listen = (
    <ListenButton
      sessionKey={question.id ? `quiz-review:${question.id}` : null}
      getChunks={() => buildAnswerReviewSpeech({ question, index, type: qType, selectedOption })}
      label="Listen"
      ariaLabel={`Listen to review of question ${index + 1}`}
      compact
    />
  );

  return (
    // Inline radius: globals.css styles .bg-card unlayered (8px), which a
    // rounded-* utility can't override.
    <article style={{ borderRadius: 14 }} className="min-w-0 border border-border bg-card p-3 sm:p-4">
      <div className="space-y-2 sm:space-y-2.5">
          {/* Position and marks, and what happened to the question. */}
          <div className="flex items-center justify-between gap-2.5">
            <p className="min-w-0 text-xs font-semibold tabular-nums text-muted-foreground">
              Question {index + 1}
              <span className="font-normal">
                {total ? ` of ${total}` : ""}, {marks} {marks === 1 ? "mark" : "marks"}
              </span>
              {question.concept && <span className="font-normal">, {question.concept}</span>}
            </p>
            <span
              style={{ borderRadius: 9999 }}
              className={`inline-flex shrink-0 items-center gap-1 px-2 py-0.5 text-[11px] font-semibold sm:text-xs ${tag.className}`}
            >
              <TagIcon size={12} strokeWidth={2.6} aria-hidden />
              {tag.label}
            </span>
          </div>

          {/* A <div>, not a heading: the text may hold code blocks. */}
          <div className="min-w-0 break-words font-serif text-sm font-medium leading-snug text-foreground sm:text-base">
            <QuizRichText text={question.question} />
          </div>

          {/* Conditional Display per Question Type */}

          {/* 1. MCQ_SINGLE / MCQ_MULTI Options Review — the same option cards
              a Self-Test shows once an answer is checked. The question's own
              explanation is shown below the options here, with Listen, so it
              is not passed in; per-option "Why it's wrong" reasons still are. */}
          {isChoice && (
            <OptionReview
              options={optionsList}
              selectedAnswer={selectedOption}
              correctAnswer={question.correctAnswer}
            />
          )}

          {/* 2. ARRANGE_TOKENS Review */}
          {qType === "ARRANGE_TOKENS" && (
            <div className="space-y-2 bg-background/40 p-2.5 sm:p-3 rounded-xl border border-slate-800">
              <div className="space-y-1 sm:space-y-1.5">
                <span className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Your Sequence:</span>
                <div className="flex flex-wrap gap-1 sm:gap-1.5">
                  {Array.isArray(selectedOption) && selectedOption.length > 0 ? (
                    selectedOption.map((token, tIdx) => {
                      const tokenText = typeof token === "string" ? token : (token?.optionText || token?.text || String(token));
                      const isCorrectPos = Array.isArray(question.correctAnswer) && question.correctAnswer[tIdx] === tokenText;
                      return (
                        <span key={tIdx} className={`px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 ${
                          isCorrectPos ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}>
                          <span className="text-[9px] opacity-60 font-bold">{tIdx + 1}</span>
                          {tokenText}
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-[11px] sm:text-xs text-muted-foreground italic">Not Answered</span>
                  )}
                </div>
              </div>

              {!isCorrect && Array.isArray(question.correctAnswer) && (
                <div className="space-y-1.5 sm:space-y-2 border-t border-transparent/50 pt-2.5 mt-2">
                  <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-wider">Correct Sequence:</span>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {question.correctAnswer.map((token, tIdx) => {
                      const tokenText = typeof token === "string" ? token : (token?.optionText || token?.text || String(token));
                      return (
                        <span key={tIdx} className="bg-muted text-foreground px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 border border-transparent/40">
                          <span className="text-[9px] text-muted-foreground font-bold">{tIdx + 1}</span>
                          {tokenText}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. MATCH_PAIRS Review */}
          {qType === "MATCH_PAIRS" && (
            <div className="space-y-2 bg-background/40 p-2.5 sm:p-3 rounded-xl border border-slate-800">
              <span className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Matches Review:</span>
              <div className="grid gap-1.5 sm:gap-2">
                {Object.entries(question.correctAnswer || {}).map(([leftItem, rightItem]) => {
                  const studentMatch = selectedOption?.[leftItem] || "";
                  const isMatchCorrect = studentMatch === rightItem;

                  return (
                    <div key={leftItem} className={`flex flex-col sm:flex-row sm:items-center justify-between p-2.5 sm:p-3.5 rounded-xl border text-[11px] sm:text-xs gap-2 ${
                      isMatchCorrect
                        ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
                        : "border-rose-500/20 bg-rose-500/5 text-rose-400"
                    }`}>
                      <div className="font-semibold flex items-center gap-2">
                        <span>{leftItem}</span>
                        <ArrowRight size={13} className="opacity-50" />
                        <span className="underline">{studentMatch || "(No Match Selected)"}</span>
                      </div>
                      {!isMatchCorrect && (
                        <div className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">
                          Expected Match: <span className="text-emerald-400 font-bold">{rightItem}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. SELF_ASSESSMENT Review */}
          {qType === "SELF_ASSESSMENT" && (
            <div className="space-y-2.5 sm:space-y-3">
              <div className="bg-background/40 p-3 sm:p-4 rounded-xl border border-slate-800 space-y-1.5 sm:space-y-2">
                <span className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Your Written Answer:</span>
                <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">
                  {selectedOption || "(No response typed)"}
                </p>
              </div>
              <div className="bg-background/20 p-3 sm:p-4 rounded-xl border border-slate-800 space-y-1.5 sm:space-y-2">
                <span className="text-[9px] sm:text-[10px] text-primary font-bold uppercase tracking-wider">Evaluation Rubric & Key:</span>
                <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {question.correctAnswer}
                </p>
              </div>
            </div>
          )}

          {status === "skipped" && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CircleMinus size={15} aria-hidden />
              You didn&apos;t answer this question
            </p>
          )}

          {/* Explanation — sent with the result once the attempt is
              submitted — with Listen, which reads the whole review of this
              question. Without an explanation, Listen stands on its own. */}
          {explanation ? (
            <div className="rounded-lg sm:rounded-xl border-l-[3px] border-emerald-500 bg-muted/50 py-1.5 pl-3 pr-2.5 sm:py-2 sm:pl-3.5 sm:pr-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-foreground sm:text-[13px]">{explanationTitle}</p>
                {listen}
              </div>
              <div className="mt-0.5 whitespace-pre-wrap break-words text-xs leading-snug text-foreground/85 sm:text-[13px]">
                <QuizRichText text={explanation} />
              </div>
            </div>
          ) : (
            <div className="flex justify-end">{listen}</div>
          )}
      </div>
    </article>
  );
}

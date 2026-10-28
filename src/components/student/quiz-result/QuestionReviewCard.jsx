"use client";

import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";

import Card from "@/components/ui/Card";
import ListenButton from "@/components/student/tts/ListenButton";
import QuizRichText from "@/components/quiz/QuizRichText";
import OptionReview, { explanationInsideOption } from "@/components/student/quiz-review/OptionReview";
import { checkAnswerCorrectness } from "@/lib/quizAnswers";
import { resolveQuestionType, TRUE_FALSE_OPTIONS } from "@/lib/questionType";
import { buildAnswerReviewSpeech } from "@/lib/quizSpeech";

// One question's row in the "Detailed Question Review" list — options review
// for MCQ types, plus dedicated layouts for ARRANGE_TOKENS/MATCH_PAIRS/
// SELF_ASSESSMENT, each showing the student's answer against the correct one.
export default function QuestionReviewCard({ question, index, userAnswer }) {
  const qType = resolveQuestionType(question.questionType);
  const selectedOption = userAnswer?.answer ?? userAnswer?.selectedOption;
  const isCorrect = checkAnswerCorrectness(qType, selectedOption, question.correctAnswer, question.options);

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

  return (
    <Card padding="" className="p-3 sm:p-6 border-border bg-background/30 min-w-0">
      <div className="flex items-start gap-2.5 sm:gap-4">
        {/* Number Badge */}
        <span className="flex-shrink-0 flex h-7 w-7 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-slate-800/80 text-xs font-bold text-foreground border border-slate-700/60">
          {index + 1}
        </span>

        <div className="flex-1 space-y-2.5 sm:space-y-4 min-w-0">
          {/* Question Title & Marks */}
          <div className="flex justify-between items-start gap-2 sm:gap-4 min-w-0">
            {/* A <div>, not a heading: the text may hold code blocks. */}
            <div className="text-xs sm:text-sm font-medium text-foreground leading-snug sm:leading-relaxed break-words flex-1 min-w-0">
              <QuizRichText text={question.question} />
            </div>
            <div className="flex flex-col items-end gap-0.5 shrink-0">
              <span className="text-[9px] sm:text-[10px] bg-slate-800/90 px-1.5 py-0.5 rounded border border-border text-muted-foreground font-bold uppercase shrink-0 whitespace-nowrap">
                <span className="sm:hidden">{question.marks || 1}M</span>
                <span className="hidden sm:inline">{question.marks || 1} {question.marks === 1 ? "Mark" : "Marks"}</span>
              </span>
              {question.concept && (
                <span className="text-[8px] sm:text-[9px] text-primary font-semibold uppercase tracking-wider">
                  {question.concept}
                </span>
              )}
            </div>
          </div>

          {/* Conditional Display per Question Type */}

          {/* 1. MCQ_SINGLE / MCQ_MULTI Options Review — the same cards a
              Self-Test shows once an answer is checked. */}
          {isChoice && (
            <OptionReview
              options={optionsList}
              selectedAnswer={selectedOption}
              correctAnswer={question.correctAnswer}
              explanation={question.explanation}
            />
          )}

          {/* 2. ARRANGE_TOKENS Review */}
          {qType === "ARRANGE_TOKENS" && (
            <div className="space-y-2.5 sm:space-y-3 bg-background/40 p-3 sm:p-4 rounded-xl border border-slate-800">
              <div className="space-y-1.5 sm:space-y-2">
                <span className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Your Sequence:</span>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
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
            <div className="space-y-2.5 sm:space-y-3 bg-background/40 p-3 sm:p-4 rounded-xl border border-slate-800">
              <span className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Matches Review:</span>
              <div className="grid gap-2 sm:gap-3">
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

          {/* Explanation — sent with the result once the attempt is
              submitted; shown (and read aloud) when the question has one.
              For a single-answer choice question it is already inside the
              correct option's card ("Why it's correct"). */}
          {question.explanation &&
            String(question.explanation).trim() &&
            !(isChoice && explanationInsideOption(optionsList, question.correctAnswer)) && (
            <div className="rounded-xl border border-border bg-muted/40 p-3 sm:p-4 space-y-1">
              <span className="text-[11px] text-primary font-bold uppercase tracking-wider">Explanation</span>
              <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
                <QuizRichText text={question.explanation} />
              </div>
            </div>
          )}

          {/* Result Summary Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 sm:pt-2.5">
            <div className="flex items-center gap-2">
            {selectedOption ? (
              <>
                {isCorrect ? (
                  <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-emerald-400 font-semibold">
                    <CheckCircle2 size={14} />
                    <span>Correct Choice</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-rose-400 font-semibold">
                    <XCircle size={14} />
                    <span>Incorrect Choice</span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground font-semibold italic">
                <XCircle size={14} />
                <span>Not Answered</span>
              </div>
            )}
            </div>
            <ListenButton
              sessionKey={question.id ? `quiz-review:${question.id}` : null}
              getChunks={() =>
                buildAnswerReviewSpeech({ question, index, type: qType, selectedOption })
              }
              label="Listen"
              ariaLabel={`Listen to review of question ${index + 1}`}
              compact
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

"use client";

import { Check, X, ArrowRight, CheckCircle2, XCircle } from "lucide-react";

import Card from "@/components/ui/Card";
import ListenButton from "@/components/student/tts/ListenButton";
import { checkAnswerCorrectness } from "@/lib/quizAnswers";
import { resolveQuestionType } from "@/lib/questionType";
import { buildAnswerReviewSpeech } from "@/lib/quizSpeech";

// One question's row in the "Detailed Question Review" list — options review
// for MCQ types, plus dedicated layouts for ARRANGE_TOKENS/MATCH_PAIRS/
// SELF_ASSESSMENT, each showing the student's answer against the correct one.
export default function QuestionReviewCard({ question, index, userAnswer }) {
  const qType = resolveQuestionType(question.questionType);
  const selectedOption = userAnswer?.answer ?? userAnswer?.selectedOption;
  const isCorrect = checkAnswerCorrectness(qType, selectedOption, question.correctAnswer);

  // Format option text mapping
  let optionsList = [];
  if (qType === "MCQ_SINGLE" || qType === "MCQ_MULTI") {
    if (typeof question.options === "string") {
      try {
        optionsList = JSON.parse(question.options);
      } catch {
        optionsList = [question.options];
      }
    } else if (Array.isArray(question.options)) {
      optionsList = question.options;
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
            <h4 className="text-xs sm:text-sm font-medium text-foreground leading-snug sm:leading-relaxed break-words flex-1">
              {question.question}
            </h4>
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

          {/* 1. MCQ_SINGLE / MCQ_MULTI Options Review */}
          {(qType === "MCQ_SINGLE" || qType === "MCQ_MULTI") && (
            <div className="grid gap-2 sm:gap-2.5">
              {optionsList.map((option, optIdx) => {
                const optionText = typeof option === "string" ? option : (option?.optionText || option?.text || String(option));
                const isSelected = qType === "MCQ_SINGLE"
                  ? selectedOption === optionText || selectedOption === option
                  : Array.isArray(selectedOption) && (selectedOption.includes(optionText) || selectedOption.includes(option));
                // The key may be a string or a one-element array — the same
                // rule checkAnswerCorrectness applies to the summary line.
                const isAnswerCorrect = qType === "MCQ_SINGLE"
                  ? checkAnswerCorrectness("MCQ_SINGLE", optionText, question.correctAnswer) ||
                    (typeof option === "object" && option?.isCorrect)
                  : Array.isArray(question.correctAnswer) && question.correctAnswer.includes(optionText);

                let optionStyle = "border-slate-800/80 bg-background/40 text-muted-foreground";
                let badgeIcon = null;
                let radioCircle = <span className="h-3.5 w-3.5 rounded-full border border-slate-600 shrink-0 mr-2.5" />;

                if (isSelected) {
                  if (isAnswerCorrect) {
                    optionStyle = "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 font-medium";
                    badgeIcon = <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />;
                    radioCircle = <span className="h-3.5 w-3.5 rounded-full border-2 border-emerald-400 bg-emerald-400/30 flex items-center justify-center shrink-0 mr-2.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /></span>;
                  } else {
                    optionStyle = "border-rose-500/40 bg-rose-500/10 text-rose-300 font-medium";
                    badgeIcon = <X className="h-3.5 w-3.5 text-rose-400 shrink-0" />;
                    radioCircle = <span className="h-3.5 w-3.5 rounded-full border-2 border-rose-400 bg-rose-400/30 flex items-center justify-center shrink-0 mr-2.5"><span className="h-1.5 w-1.5 rounded-full bg-rose-400" /></span>;
                  }
                } else if (isAnswerCorrect) {
                  optionStyle = "border-emerald-500/30 bg-emerald-500/5 text-emerald-400";
                  badgeIcon = <Check className="h-3.5 w-3.5 text-emerald-500/60 shrink-0" />;
                  radioCircle = <span className="h-3.5 w-3.5 rounded-full border border-emerald-500/50 shrink-0 mr-2.5" />;
                }

                return (
                  <div
                    key={optIdx}
                    className={`flex items-center justify-between rounded-lg sm:rounded-xl border px-3 py-2 sm:p-3.5 text-[11px] sm:text-xs min-h-[36px] transition ${optionStyle}`}
                  >
                    <div className="flex items-center min-w-0 pr-2">
                      {radioCircle}
                      <span className="break-words leading-tight sm:leading-normal">{optionText}</span>
                    </div>
                    {badgeIcon}
                  </div>
                );
              })}
            </div>
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
              submitted; shown (and read aloud) when the question has one. */}
          {question.explanation && String(question.explanation).trim() && (
            <div className="rounded-xl border border-border bg-muted/40 p-3 sm:p-4 space-y-1">
              <span className="text-[9px] sm:text-[10px] text-primary font-bold uppercase tracking-wider">Explanation</span>
              <p className="text-[11px] sm:text-xs text-foreground leading-relaxed whitespace-pre-wrap break-words">
                {question.explanation}
              </p>
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

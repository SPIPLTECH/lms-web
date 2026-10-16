"use client";

import { useEffect, useMemo, useState } from "react";
import { Lightbulb } from "lucide-react";
import OptionList from "./OptionList";
import MCQMultiOptionList from "./MCQMultiOptionList";
import ArrangeTokensList from "./ArrangeTokensList";
import MatchPairsGrid from "./MatchPairsGrid";
import SelfAssessmentInput from "./SelfAssessmentInput";
import ListenButton from "@/components/student/tts/ListenButton";
import { resolveQuestionType } from "@/lib/questionType";
import { buildQuestionSpeech } from "@/lib/quizSpeech";
import { resolveSpeechLang } from "@/lib/textToSpeech";

export default function QuestionCard({
  question,
  selectedAnswer,
  onSelectAnswer,
  questionNumber,
  totalQuestions,
  speechLanguage,
  // Whether this attempt may see hints at all. The server decides it (a
  // qualifying test, second attempt onward) and withholds the hint text
  // entirely otherwise — this flag only drives the control, it does not guard
  // the content.
  hintsUnlocked = false,
  onViewHint,
}) {
  const type = resolveQuestionType(question?.questionType);

  // Revealed only on an explicit click, and never carried over to the next
  // question — a hint the student did not ask for is not a hint.
  const [hintRevealed, setHintRevealed] = useState(false);
  useEffect(() => {
    setHintRevealed(false);
  }, [question?.id]);

  // Three distinct states, and they must not be conflated: no hint was
  // authored for this question; a hint exists but this attempt hasn't earned
  // it; or it is there to be asked for. `hasHint` arrives even when the text
  // does not, so the first case can be told apart from the second without
  // leaking anything.
  const hintText = typeof question?.hint === "string" ? question.hint.trim() : "";
  const canAskForHint = hintsUnlocked && hintText.length > 0;

  const revealHint = () => {
    setHintRevealed(true);
    onViewHint?.();
  };

  // Deterministic-ish stable random shuffle helper for single option, multioption, and arrange tokens
  const shuffledOptions = useMemo(() => {
    if (!question?.options) return [];
    let opts = question.options;
    if (typeof opts === "string") {
      try {
        opts = JSON.parse(opts);
      } catch {
        opts = [];
      }
    }
    if (!Array.isArray(opts)) return [];

    return [...opts].sort(() => Math.random() - 0.5);
  }, [question]);

  // Deterministic-ish stable random shuffle for Match Pairs column B (Right side options)
  const shuffledMatchOptions = useMemo(() => {
    if (type !== "MATCH_PAIRS" || !question?.options) return {};

    let opts = question.options;
    if (typeof opts === "string") {
      try {
        opts = JSON.parse(opts);
      } catch {
        opts = {};
      }
    }

    const colA = opts?.columnA || opts?.left || [];
    const colB = opts?.columnB || opts?.right || [];

    return {
      columnA: colA,
      columnB: [...colB].sort(() => Math.random() - 0.5),
    };
  }, [question, type]);

  if (!question) return null;

  // Built at click time from the options exactly as shuffled on screen, so
  // "A." in speech is the "A" the student sees.
  const lang = resolveSpeechLang(speechLanguage);
  const getQuestionSpeech = () =>
    buildQuestionSpeech({
      question,
      type,
      options: shuffledOptions,
      matchOptions: shuffledMatchOptions,
      questionNumber,
      totalQuestions,
      lang,
    });

  return (
    <div className="rounded-2xl border border-border bg-background p-2.5 sm:p-4 shadow-xl">
      {/* Question Text + Concept / Marks */}
      <div className="mb-2.5 sm:mb-4 flex items-start justify-between gap-2.5 min-w-0">
        <h2 className="text-sm sm:text-xl font-semibold leading-snug text-foreground break-words flex-1 min-w-0">
          {question.question}
        </h2>

        <div className="flex shrink-0 items-center gap-1.5">
          {/* Beside the question, not in a separate audio section, so it's
              reachable without scrolling on a phone. Keyed by question: moving
              to another question stops this one's speech. */}
          <ListenButton
            sessionKey={question.id ? `quiz-question:${question.id}` : null}
            getChunks={getQuestionSpeech}
            lang={lang}
            label="Listen"
            ariaLabel="Listen to question"
            compact
          />
          {question.concept && (
            <div className="hidden sm:inline-block rounded-lg bg-muted border border-transparent px-2.5 py-1 text-xs font-medium text-foreground">
              Concept: <span className="text-primary font-semibold">{question.concept}</span>
            </div>
          )}

          <div className="rounded-lg bg-primary/10 px-2 py-0.5 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-semibold text-primary whitespace-nowrap">
            {question.marks} {question.marks === 1 ? "Mark" : "Marks"}
          </div>
        </div>
      </div>

      {/* HINT — a qualifying test from the second attempt onward. Never opens
          by itself: the student asks for it, and asking is what gets recorded
          as hintViewed on this attempt's question record. A question with no
          hint authored renders nothing at all rather than a control that
          would reveal an empty box. */}
      {canAskForHint && (
        <div className="mb-2.5 sm:mb-4">
          {hintRevealed ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 sm:rounded-xl sm:p-3.5">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 sm:text-[11px]">
                <Lightbulb size={13} className="shrink-0" aria-hidden />
                Hint
              </p>
              <p className="mt-1.5 break-words text-xs leading-relaxed text-foreground sm:text-sm">
                {hintText}
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={revealHint}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-amber-500/40 px-3 text-xs font-semibold text-amber-700 transition hover:bg-amber-500/10 dark:text-amber-400 sm:min-h-0 sm:py-2 sm:text-sm"
            >
              <Lightbulb size={14} className="shrink-0" aria-hidden />
              Show Hint
            </button>
          )}
        </div>
      )}

      {/* Options Rendering per Question Type */}
      <div>
        {type === "MCQ_SINGLE" && (
          <OptionList
            options={shuffledOptions}
            selectedAnswer={selectedAnswer}
            onSelect={onSelectAnswer}
          />
        )}
        {type === "MCQ_MULTI" && (
          <MCQMultiOptionList
            options={shuffledOptions}
            selectedAnswers={selectedAnswer || []}
            onSelect={onSelectAnswer}
          />
        )}
        {type === "ARRANGE_TOKENS" && (
          <ArrangeTokensList
            options={shuffledOptions}
            selectedOrder={selectedAnswer || []}
            onOrderChange={onSelectAnswer}
          />
        )}
        {type === "MATCH_PAIRS" && (
          <MatchPairsGrid
            options={shuffledMatchOptions}
            selectedPairs={selectedAnswer || {}}
            onPairsChange={onSelectAnswer}
          />
        )}
        {type === "SELF_ASSESSMENT" && (
          <SelfAssessmentInput
            value={selectedAnswer || ""}
            onChange={onSelectAnswer}
          />
        )}
      </div>
    </div>
  );
}
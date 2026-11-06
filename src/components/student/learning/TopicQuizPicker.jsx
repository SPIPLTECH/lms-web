"use client";

import { ChevronRight, ClipboardList, Lock } from "lucide-react";

import { isTextbookPractice, labelledOfType, typedSubTopics } from "@/lib/questionTypes";

// The topic quiz picker (SSC Class 10 Test Series): what the player shows when
// the student clicks a Topic whose SubTopics carry board question types.
// "About" (type "All") shows the topic's description; a type shows one row per
// question of that type; a row opens that SubTopic's first step — its step
// quiz — through the page's usual gated navigation (onPick -> goToStep).

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * A Topic's description as stored for the 10th course: a paragraph, then
 * "**Key ideas**" and a "- " list. Plain text without the list is the
 * description alone.
 */
function parseAbout(text) {
  const value = String(text || "").replace(/\r\n/g, "\n").trim();
  const [description, ideas = ""] = value.split(/\n\s*\*\*Key ideas\*\*\s*\n/);
  const keyIdeas = ideas
    .split("\n")
    .map((line) => line.replace(/^\s*[-•]\s+/, "").trim())
    .filter(Boolean);
  return { description: description.trim(), keyIdeas };
}

function firstQuizStep(node, steps) {
  for (const entry of node.entries || []) {
    if (entry.type !== "step") continue;
    const step = steps[entry.stepIndex];
    if (step?.kind === "QUIZ") return step;
  }
  return null;
}

// `label`: "Question n" for a board question, "Practice n" for a textbook one,
// counted within the type (lib/questionTypes.js labelledOfType) — the stored
// titles number the topic as a whole. `practice` adds the "Textbook" badge.
function QuizRow({ node, label, practice, steps, onPick }) {
  const quiz = firstQuizStep(node, steps);
  const { type, marks } = node.questionType;
  const details = [
    type,
    marks ? plural(marks, "mark") : null,
    quiz?.questionCount ? plural(quiz.questionCount, type === "MCQs" ? "question" : "step") : null,
  ].filter(Boolean);
  // No progress shown (Done / In progress) — the 10th course shows none.

  return (
    <li>
      <button
        type="button"
        onClick={() => node.firstStepIndex !== null && onPick(node.firstStepIndex)}
        style={{ borderRadius: 12 }}
        className={`group flex w-full items-center gap-3 border px-3 py-3 text-left transition cursor-pointer sm:px-4 ${
          node.locked
            ? "border-border/60 bg-background/30 text-muted-foreground"
            : "border-border bg-background/60 hover:border-primary/50 hover:bg-primary/5"
        }`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {node.locked ? <Lock size={16} aria-hidden="true" /> : <ClipboardList size={16} aria-hidden="true" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-foreground">
            {label}
            {practice && (
              <span className="ml-1.5 inline-block rounded-full border border-primary/40 px-1.5 py-px align-[1px] text-[10px] font-bold uppercase tracking-wide text-primary">
                Textbook
              </span>
            )}
            {/* The MCQ's quiz is titled "<topic>: MCQ's" — nothing to add. */}
            {quiz?.title && !quiz.title.endsWith(node.title) && (
              <span className="font-normal text-foreground/80"> — {quiz.title}</span>
            )}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">{details.join(" · ")}</span>
        </span>
        <ChevronRight
          size={16}
          aria-hidden="true"
          className="shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary"
        />
      </button>
    </li>
  );
}

export default function TopicQuizPicker({ topic, steps, type = "All", onPick }) {
  const nodes = typedSubTopics(topic);
  const groups = [{ type, nodes: nodes.filter((n) => n.questionType.type === type) }];

  // "About" (the first tag, value "All"): the topic's description alone,
  // filling the player — the questions are behind the type tags.
  if (type === "All") {
    const { description, keyIdeas } = parseAbout(topic.about);
    return (
      <div className="flex h-full min-h-[320px] flex-col p-3 sm:p-5">
        <div className="flex flex-1 flex-col justify-center gap-6 rounded-2xl border border-border bg-muted/30 px-5 py-7 sm:px-10 sm:py-10">
          <div>
            <p className="text-[12px] font-black uppercase tracking-widest text-primary">About this topic</p>
            <h2 className="mt-2 text-2xl font-bold leading-tight text-foreground [text-wrap:balance] sm:text-4xl">
              {topic.title}
            </h2>
          </div>
          <p className="max-w-[70ch] text-base leading-relaxed text-foreground/85 sm:text-xl sm:leading-relaxed">
            {description || "This topic has no description yet."}
          </p>
          {keyIdeas.length > 0 && (
            <section className="rounded-xl border border-border bg-background/70 px-4 py-4 sm:px-6 sm:py-5">
              <h3 className="mb-3 text-xs font-black uppercase tracking-wider text-muted-foreground">Key ideas</h3>
              <ul className="grid gap-x-8 gap-y-2.5 text-sm leading-relaxed text-foreground/90 sm:text-base lg:grid-cols-2">
                {keyIdeas.map((idea, index) => (
                  <li key={index} className="flex gap-2.5">
                    <span aria-hidden="true" className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span className="min-w-0">{idea}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-5">
      <p className="text-[12px] font-black uppercase tracking-widest text-muted-foreground">Topic</p>
      <h2 className="text-lg font-bold text-foreground">{topic.title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {/* Says "board" only when board questions are listed: a topic (or
            type) with textbook practice alone never mentions the board. */}
        {(() => {
          const shown = groups[0].nodes;
          const hasBoard = shown.some((n) => !isTextbookPractice(n));
          const hasTextbook = shown.some(isTextbookPractice);
          if (hasBoard && hasTextbook) return `${type}: the board questions first, then textbook practice. Pick the quiz you want to do.`;
          if (hasTextbook) return `${type}: textbook practice for this topic. Pick the quiz you want to do.`;
          return `${type} asked in the board from this topic. Pick the quiz you want to do.`;
        })()}
      </p>

      <div className="mt-4 space-y-5">
        {groups.map((group) => (
          <section key={group.type}>
            <ul className="space-y-2">
              {labelledOfType(group.nodes).map(({ node, label, practice }) => (
                <QuizRow key={node.id} node={node} label={label} practice={practice} steps={steps} onPick={onPick} />
              ))}
            </ul>
          </section>
        ))}
        {!groups[0]?.nodes.length && (
          <p className="text-sm text-muted-foreground">No {type} questions in this topic.</p>
        )}
      </div>
    </div>
  );
}

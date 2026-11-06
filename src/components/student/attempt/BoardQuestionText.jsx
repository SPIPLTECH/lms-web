"use client";

import QuizRichText from "@/components/quiz/QuizRichText";
import { getDisplayUrl } from "@/lib/blob";
import { parseBoardQuestion, splitReason } from "@/lib/boardQuestion";
import { isRichQuizText } from "@/lib/quizText";

// The question text of the 10th (board-paper) course, laid out instead of one
// block of bold text: the question in a soft card, unlabelled and always open
// (its "Activity :" lines in a box, ☐ blanks drawn as boxes, the figure
// centred with its note as a caption), then the step's title and
// its own question, large. A text
// that is not a step question (a 1-mark MCQ) keeps one block, with the same
// blanks. Text with Markdown is left to QuizRichText.

function Blank() {
  return (
    <span
      role="img"
      aria-label="blank"
      className="mx-0.5 inline-block h-[1.15em] w-[1.9em] translate-y-[0.15em] rounded-md border-2 border-dashed border-primary/60 bg-primary/10"
    />
  );
}

/** Plain text with its ☐ blanks drawn as boxes; Markdown goes to QuizRichText. */
function Inline({ text }) {
  if (isRichQuizText(text)) return <QuizRichText text={text} preserveLines />;
  const parts = text.split("☐");
  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, index) => (
        <span key={index}>
          {part}
          {index < parts.length - 1 && <Blank />}
        </span>
      ))}
    </span>
  );
}

function ContextBlock({ block }) {
  if (block.kind === "text") {
    return (
      <p className="leading-relaxed">
        <Inline text={block.text} />
      </p>
    );
  }
  if (block.kind === "activity") {
    return (
      <div className="rounded-xl border border-primary/30 bg-background/70 px-3 py-2.5 sm:px-4">
        <p className="mb-1.5 text-xs font-black uppercase tracking-wider text-primary">Activity</p>
        <ul className="space-y-1">
          {block.lines.map((line, index) => {
            const [work, reason] = splitReason(line);
            return (
              <li key={index} className="leading-relaxed">
                <Inline text={work} />
                {reason && <span className="ml-2 text-sm italic text-muted-foreground">— {reason}</span>}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
  if (block.kind === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- private R2 upload through getDisplayUrl, as in quizRichText
      <img
        src={getDisplayUrl(block.url, { width: 1280 })}
        alt={block.alt}
        loading="lazy"
        className="mx-auto max-h-[22rem] w-auto max-w-full rounded-xl border border-border bg-white p-2"
      />
    );
  }
  // caption
  return <p className="text-center text-xs italic text-muted-foreground">{block.text}</p>;
}

/**
 * The question (board or textbook) in a soft card, always shown in full — no
 * label, no fold, no marks badge, at the user's request — then the step's
 * title and the step's own question.
 * @param {string} text the question text
 */
export default function BoardQuestionText({ text }) {
  const parsed = parseBoardQuestion(text);

  if (!parsed) {
    return (
      <div className="text-base font-semibold leading-relaxed text-foreground sm:text-xl">
        <Inline text={String(text ?? "")} />
      </div>
    );
  }

  const hasContext = parsed.context.length > 0;
  return (
    <div className="space-y-3 sm:space-y-4">
      {hasContext && (
        <section className="space-y-3 rounded-2xl border border-border bg-muted/40 p-3 text-sm text-foreground sm:p-4 sm:text-base">
          {parsed.context.map((block, index) => (
            <ContextBlock key={index} block={block} />
          ))}
        </section>
      )}

      <div>
        {/* The step's title only — no "½ mark each" badge (removed at the
            user's request; parseBoardQuestion strips it from the title). */}
        {parsed.title && parsed.title !== parsed.ask && (
          <p className="mb-1.5 text-sm font-bold text-foreground sm:text-base">{parsed.title}</p>
        )}
        <div className="text-base font-semibold leading-relaxed text-foreground sm:text-xl">
          <Inline text={parsed.ask} />
        </div>
      </div>
    </div>
  );
}

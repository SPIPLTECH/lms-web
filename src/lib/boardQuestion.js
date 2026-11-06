// Board-paper step questions (SSC Class 10 Test Series) are stored as one
// string: the board question (its text, an "Activity :" block, a
// "(Figure: …)" note and the figure as ![Image](url)), then
// "Question to this step: <title>" and the step's own question.
// parseBoardQuestion splits that into parts the player can lay out
// (components/student/attempt/BoardQuestionText.jsx). Pure — no DOM.

const STEP_MARKER = "Question to this step:";
const IMAGE_LINE = /^!\[([^\]\n]*)\]\(([^)\s]+)\)$/;
const FIGURE_NOTE = /^\(Figure:[\s\S]*\)$/;
const ACTIVITY_HEAD = /^Activity\s*:?\s*$/i;
// "(½ mark each)", "(1 mark)", "(2 marks)" at the end of a step title.
const MARKS_NOTE = /\s*\(([^()]*\bmarks?\b[^()]*)\)\s*$/i;

/**
 * Splits a board-paper question into parts, or returns null when the text is
 * not a step question (no "Question to this step:") — e.g. a 1-mark MCQ —
 * so the caller renders it as before.
 *
 * @returns {null | {
 *   context: Array<{ kind: "text", text: string }
 *                | { kind: "activity", lines: string[] }
 *                | { kind: "image", url: string, alt: string }
 *                | { kind: "caption", text: string }>,
 *   title: string, marks: string | null, ask: string }}
 */
export function parseBoardQuestion(text) {
  const value = typeof text === "string" ? text.replace(/\r\n/g, "\n") : "";
  const at = value.indexOf(STEP_MARKER);
  if (at < 0) return null;

  const stepLines = value.slice(at + STEP_MARKER.length).trim().split("\n");
  let title = (stepLines.shift() || "").trim();
  const ask = stepLines.join("\n").trim();
  let marks = null;
  const marksMatch = MARKS_NOTE.exec(title);
  if (marksMatch) {
    marks = marksMatch[1].trim();
    title = title.slice(0, marksMatch.index).trim();
  }

  const context = [];
  let paragraph = [];
  let activity = null;
  const flushParagraph = () => {
    if (paragraph.length) context.push({ kind: "text", text: paragraph.join("\n") });
    paragraph = [];
  };

  for (const raw of value.slice(0, at).split("\n")) {
    const line = raw.trim();
    const image = IMAGE_LINE.exec(line);
    if (image) {
      flushParagraph();
      context.push({ kind: "image", url: image[2], alt: image[1] || "Figure" });
    } else if (FIGURE_NOTE.test(line)) {
      flushParagraph();
      context.push({ kind: "caption", text: line.slice(1, -1).replace(/^Figure:\s*/, "") });
    } else if (ACTIVITY_HEAD.test(line)) {
      flushParagraph();
      activity = { kind: "activity", lines: [] };
      context.push(activity);
    } else if (!line) {
      if (!activity) flushParagraph();
    } else if (activity) {
      activity.lines.push(line);
    } else {
      paragraph.push(line);
    }
  }
  flushParagraph();

  return { context, title, marks, ask: ask || title };
}

/**
 * An activity line split into the working and its trailing reason
 * ("tₙ = a + (n − 1) d ……… formula" → ["tₙ = a + (n − 1) d", "formula"]).
 */
export function splitReason(line) {
  const match = /^(.*?\S)\s*(?:…{2,}|\.{4,})\s*(\S.*)$/.exec(line);
  return match ? [match[1], match[2]] : [line, null];
}

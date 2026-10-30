"use client";

import { useMemo } from "react";

import { isRichQuizText } from "@/lib/quizText";
import { renderQuizRichText } from "@/lib/quizRichText";

// One handler for every code cell's Copy button (they live inside injected
// HTML). Stops the click there, so copying code in an option never also picks
// that option.
function handleCopyClick(event) {
  const button = event.target.closest?.("[data-qcode-copy]");
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  const code = button.closest(".qcode")?.querySelector(".qcode-pre")?.textContent ?? "";
  navigator.clipboard
    ?.writeText(code)
    .then(() => {
      button.textContent = "Copied";
      setTimeout(() => {
        button.textContent = "Copy";
      }, 1500);
    })
    .catch(() => {});
}

/**
 * Quiz text (question, option, explanation, hint) as the student sees it.
 *
 * Plain text renders as the bare string, exactly as it did before quiz text
 * could hold Markdown, so the caller's own element and classes still style
 * it. With `preserveLines`, a plain multi-line option keeps its lines.
 *
 * Text written as Markdown (lib/quizText.js) renders as a block, so the
 * caller's element must be a block that may hold one — a <div>, never a
 * <p>, <span>, heading or <button>. `variant` "option" gives answer choices
 * a slimmer code cell.
 */
export default function QuizRichText({ text, variant = "body", preserveLines = false, className = "" }) {
  const value = text === null || text === undefined ? "" : String(text);
  const rich = isRichQuizText(value);
  const html = useMemo(() => (rich ? renderQuizRichText(value, variant) : ""), [rich, value, variant]);

  // The same element for the same HTML, so a parent re-render never
  // re-assigns innerHTML (React 19 does whenever the __html object is new)
  // and wipes a text selection inside the code.
  const body = useMemo(
    () => (
      <div
        className={`quiz-rich ${className}`.trim()}
        onClick={handleCopyClick}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    ),
    [html, className]
  );

  if (!rich) {
    return preserveLines && value.includes("\n") ? <span className="whitespace-pre-wrap">{value}</span> : value;
  }
  return body;
}

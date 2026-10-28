/**
 * The on-screen render of quiz text the author wrote as Markdown (see
 * isRichQuizText in lib/quizText.js — plain text never comes here). Same
 * Marked + highlight.js + DOMPurify stack as lesson content (lib/markdown.js)
 * with three differences quiz text needs:
 *
 *  - Raw HTML is shown as text, never parsed: "if a<b and c>d" must not lose
 *    "<b and c>" to a tag.
 *  - A single line break is kept: the author's lines are the question's lines.
 *  - A ``` block becomes a code cell: language label, copy button and line
 *    numbers in a question; a slimmer cell, without them, in an option.
 *    Code is coloured only when the fence names a language: guessing
 *    colours pseudocode at random.
 */

import { Marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

import { highlightCode } from "@/lib/markdown";
import { quizCodeLanguageLabel, resolveQuizCodeLanguage } from "@/lib/quizText";

// Line numbers only help once there are enough lines to refer to.
const MIN_NUMBERED_LINES = 4;

const escapeHtml = (text) =>
  String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function codeCell(text, lang, compact) {
  const language = resolveQuizCodeLanguage(lang);
  const label = quizCodeLanguageLabel(language);
  const code = language ? highlightCode(text, language) : escapeHtml(text);
  const lineCount = text.split("\n").length;
  const numbered = !compact && lineCount >= MIN_NUMBERED_LINES;

  const bar = compact
    ? label
      ? `<div class="qcode-bar"><span class="qcode-lang">${label}</span></div>`
      : ""
    : `<div class="qcode-bar"><span class="qcode-lang">${label || "Code"}</span>` +
      `<button type="button" class="qcode-copy" data-qcode-copy>Copy</button></div>`;
  const gutter = numbered
    ? `<pre class="qcode-gutter" aria-hidden="true">${Array.from({ length: lineCount }, (_, i) => i + 1).join("\n")}</pre>`
    : "";

  return (
    `<div class="qcode${compact ? " qcode-compact" : ""}"${language ? ` data-lang="${language}"` : ""}>${bar}` +
    `<div class="qcode-body">${gutter}<pre class="qcode-pre"><code class="hljs${language ? ` language-${language}` : ""}">${code}</code></pre></div>` +
    `</div>`
  );
}

const makeMarked = (compact) =>
  new Marked({
    gfm: true,
    breaks: true,
    renderer: {
      code({ text, lang }) {
        return codeCell(text, lang, compact);
      },
      html({ text }) {
        return escapeHtml(text);
      },
    },
  });

const renderers = { body: makeMarked(false), option: makeMarked(true) };

/**
 * Sanitized HTML for one piece of rich quiz text. `variant` is "body" for a
 * question, explanation or hint, "option" for an answer choice.
 */
export function renderQuizRichText(source, variant = "body") {
  if (!source) return "";
  const html = (renderers[variant] || renderers.body).parse(source);
  return DOMPurify.sanitize(html, { ADD_ATTR: ["class", "data-qcode-copy", "data-lang"] });
}

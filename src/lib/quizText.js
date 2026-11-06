/**
 * Quiz text (question, options, explanation, hint) is plain text unless its
 * author wrote Markdown into it. Only text with inline `code`, a ``` code
 * block, **bold** or an ![image](url) is treated as Markdown: that is what the
 * quiz editor's toolbar writes, and what imported code questions already use.
 * Anything else renders exactly as it always has. Over 5,000 existing questions
 * use `___` blanks, `a < b`, `2 * 3` and lone `#` options, which Markdown would
 * otherwise turn into rules, tags, italics and headings.
 *
 * Pure (no DOM), so read-aloud (quizSpeech.js) and tests can use it. The
 * on-screen render is lib/quizRichText.js.
 */

import { Lexer } from "marked";

const RICH_MARKERS = /`|\*\*|!\[[^\]\n]*\]\(/;

export function isRichQuizText(text) {
  return typeof text === "string" && RICH_MARKERS.test(text);
}

/** Display names for the code block languages the quiz editor offers. */
export const QUIZ_CODE_LANGUAGES = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "java", label: "Java" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "csharp", label: "C#" },
  { value: "sql", label: "SQL" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "bash", label: "Bash" },
  { value: "json", label: "JSON" },
];

// Aliases an author may type after ``` by hand, mapped to the name above.
const LANGUAGE_ALIASES = {
  py: "python",
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  "c++": "cpp",
  "c#": "csharp",
  cs: "csharp",
  xml: "html",
  sh: "bash",
  shell: "bash",
};

/** The language a ``` fence names, as one of QUIZ_CODE_LANGUAGES' values, or "". */
export function resolveQuizCodeLanguage(lang) {
  const name = String(lang || "").toLowerCase().trim().split(/\s+/)[0];
  const resolved = LANGUAGE_ALIASES[name] || name;
  return QUIZ_CODE_LANGUAGES.some((l) => l.value === resolved) ? resolved : "";
}

export function quizCodeLanguageLabel(lang) {
  return QUIZ_CODE_LANGUAGES.find((l) => l.value === resolveQuizCodeLanguage(lang))?.label || "";
}

const lexer = () => new Lexer({ gfm: true, breaks: true });

const SPOKEN = {
  code: (lang) => {
    const label = quizCodeLanguageLabel(lang);
    return ` ${label ? `${label} code` : "Code"} shown on screen. `;
  },
  image: " Image shown on screen. ",
};

const SUMMARY = { code: () => " [code] ", image: " [image] " };

function plainTokens(tokens = [], say) {
  return tokens
    .map((token) => {
      switch (token.type) {
        case "code":
          return say.code(token.lang);
        case "image":
          return say.image;
        case "codespan":
        case "escape":
        case "html":
          return token.text;
        case "br":
          return " ";
        case "space":
        case "hr":
          return " ";
        case "list":
          return ` ${token.items.map((item) => plainTokens(item.tokens, say).trim()).join(". ")}. `;
        default:
          return token.tokens ? ` ${plainTokens(token.tokens, say)} ` : token.text || "";
      }
    })
    .join("");
}

const flatten = (text, say) =>
  plainTokens(lexer().lex(text), say).replace(/\s+/g, " ").replace(/\s+([.,;:!?])/g, "$1").trim();

/**
 * What read-aloud says for a piece of quiz text: plain text as it is;
 * Markdown without its markers, each code block as "Python code shown on
 * screen" rather than every bracket and colon in it, and each image as
 * "Image shown on screen" rather than its address.
 */
export function quizTextForSpeech(text) {
  if (!isRichQuizText(text)) return text ?? "";
  return flatten(text, SPOKEN);
}

/**
 * Quiz text on one line, for lists, dropdowns and clamped previews that
 * can't hold a code cell or an image: Markdown markers dropped, each code
 * block shown as "[code]" and each image as "[image]".
 */
export function quizTextSummary(text) {
  if (!isRichQuizText(text)) return text ?? "";
  return flatten(text, SUMMARY);
}

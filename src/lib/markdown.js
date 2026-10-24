import { Marked } from "marked";
import DOMPurify from "isomorphic-dompurify";
import hljs from "highlight.js/lib/core";

import { rewritePrivateBlobUrlsInHtml } from "@/lib/blob";

import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import java from "highlight.js/lib/languages/java";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import csharp from "highlight.js/lib/languages/csharp";
import sql from "highlight.js/lib/languages/sql";
import json from "highlight.js/lib/languages/json";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import bash from "highlight.js/lib/languages/bash";

const LANGUAGES = {
  javascript,
  js: javascript,
  jsx: javascript,
  typescript,
  ts: typescript,
  tsx: typescript,
  python,
  py: python,
  java,
  c,
  cpp,
  "c++": cpp,
  csharp,
  "c#": csharp,
  cs: csharp,
  sql,
  json,
  xml,
  html: xml,
  css,
  bash,
  sh: bash,
  shell: bash,
};

let registered = false;
function ensureLanguagesRegistered() {
  if (registered) return;
  for (const [name, def] of Object.entries(LANGUAGES)) {
    if (!hljs.getLanguage(name)) hljs.registerLanguage(name, def);
  }
  registered = true;
}

const marked = new Marked({
  gfm: true,
  breaks: false,
  renderer: {
    code({ text, lang }) {
      ensureLanguagesRegistered();
      const language = lang ? lang.toLowerCase().trim().split(/\s+/)[0] : "";
      const highlighted = hljs.getLanguage(language)
        ? hljs.highlight(text, { language }).value
        : hljs.highlightAuto(text).value;
      const langClass = (language && hljs.getLanguage(language)) ? ` language-${language} hljs` : " hljs";
      return `<pre><code class="${langClass.trim()}">${highlighted}</code></pre>`;
    },
  },
});

/**
 * Syntax-highlights a raw code string to sanitized HTML spans (`hljs-*` classes),
 * for content stored as-is rather than as a Markdown fenced code block (e.g. a
 * standalone CODE content block's `htmlContent`). Falls back to hljs's language
 * auto-detection when no language is given or it isn't a registered one.
 */
export function highlightCode(code, language) {
  if (!code) return "";
  ensureLanguagesRegistered();
  const lang = language ? language.toLowerCase().trim().split(/\s+/)[0] : "";
  const highlighted = hljs.getLanguage(lang)
    ? hljs.highlight(code, { language: lang }).value
    : hljs.highlightAuto(code).value;
  return DOMPurify.sanitize(highlighted, { ADD_ATTR: ["class"] });
}

/**
 * `marked`'s `code()` renderer (above) only runs for content it actually parses
 * as a Markdown-fenced code block — legacy rows that already contain raw
 * `<pre><code>` HTML (old Quill-authored content, or code pasted without
 * triple-backtick fences) pass straight through untouched and never get
 * highlighted. Client-side only (all callers are "use client" components):
 * parses the sanitized HTML into a detached DOM, finds any `pre code` not
 * already marked `.hljs`, and highlights it in place via `highlightCode`.
 */
function highlightLegacyCodeBlocks(html) {
  if (typeof document === "undefined") return html;
  const container = document.createElement("div");
  container.innerHTML = html;
  const blocks = container.querySelectorAll("pre code:not(.hljs)");
  blocks.forEach((block) => {
    const langMatch = /language-(\S+)/.exec(block.className || "");
    block.innerHTML = highlightCode(block.textContent || "", langMatch ? langMatch[1] : undefined);
    block.classList.add("hljs");
  });
  return container.innerHTML;
}

/**
 * Ensures any `<table>` tag (from raw legacy HTML or markdown) is wrapped in a
 * `.md-table-wrapper` container so horizontal overflow is owned strictly by the
 * table wrapper rather than expanding the main prose container.
 */
function wrapLegacyTables(html) {
  if (typeof document === "undefined") return html;
  const container = document.createElement("div");
  container.innerHTML = html;
  const tables = container.querySelectorAll("table");
  tables.forEach((table) => {
    if (table.parentElement && table.parentElement.classList.contains("md-table-wrapper")) {
      return;
    }
    const wrapper = document.createElement("div");
    wrapper.className = "md-table-wrapper";
    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  });
  return container.innerHTML;
}

/**
 * Renders a Markdown (or, for not-yet-migrated legacy rows, raw HTML — `marked`
 * passes untouched HTML blocks straight through) source string to sanitized HTML
 * safe for `dangerouslySetInnerHTML`. Single source of truth for every "view mode"
 * render of a Module/Lesson/Topic description or Content text block.
 */
export function renderMarkdownToSafeHtml(source) {
  if (!source) return "";
  const html = marked.parse(source);
  const safeHtml = DOMPurify.sanitize(html, { ADD_ATTR: ["target", "class"] });
  const highlightedHtml = highlightLegacyCodeBlocks(safeHtml);
  const wrappedTablesHtml = wrapLegacyTables(highlightedHtml);
  // Imported lesson content can carry raw <img>/<a> URLs pointing straight at
  // a private Vercel Blob file — those 403 unless routed through the
  // /api/blob-proxy proxy that getDisplayUrl() otherwise handles for us.
  return rewritePrivateBlobUrlsInHtml(wrappedTablesHtml);
}

/**
 * The backend's `Content.htmlContent` field (unlike Module/Lesson/Topic
 * `description`) is run through a server-side `sanitize-html` pass on every
 * create/update, which parses the value as HTML and silently deletes anything
 * that looks like an unrecognized tag (e.g. Markdown `List<String>` or a
 * `<https://...>` autolink lose the bracketed part entirely). Escaping the
 * three HTML metacharacters before sending, and decoding them back after
 * reading, round-trips the raw Markdown through that pass unchanged — verified
 * against the real backend sanitizer for headings, code fences, blockquotes,
 * and autolinks. Only the Content "text" cell needs this; Module/Lesson/Topic
 * `description` has no server-side processing at all.
 */
export function escapeForContentApi(markdown) {
  if (!markdown) return markdown;
  return markdown.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function unescapeFromContentApi(html) {
  if (!html) return html;
  return html.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

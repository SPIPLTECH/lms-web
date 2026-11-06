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

// Only a value escapeForContentApi produced is decoded. That one has no raw
// "<" at all; a value with real tags is HTML (imported or legacy rows), whose
// entities are meant to stay escaped — decoding `<code>&lt;p&gt;</code>`
// would turn the example into a live <p> tag and the text would vanish.
const HAS_HTML_TAG = /<[a-zA-Z/!]/;

export function unescapeFromContentApi(html) {
  if (!html || HAS_HTML_TAG.test(html)) return html;
  return html.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

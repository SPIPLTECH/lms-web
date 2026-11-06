import DOMPurify from "isomorphic-dompurify";

const FORBIDDEN_PREVIEW_TAGS = [
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "applet",
  "form",
  "input",
  "button",
  "select",
  "textarea",
  "meta",
  "link",
  "base",
  "svg",
  "math",
];

const FORBIDDEN_PREVIEW_ATTRS = [
  "style",
  "onerror",
  "onload",
  "onclick",
  "onmouseover",
  "onmouseenter",
  "onfocus",
  "onblur",
  "srcdoc",
];

/**
 * Sanitizes untrusted AI-generated HTML before rendering in preview cards.
 * Strips active tags, event handlers, inline styles, and unsafe URI schemes.
 */
export function sanitizeAiPreviewHtml(dirtyHtml) {
  if (!dirtyHtml) return "";
  return DOMPurify.sanitize(String(dirtyHtml), {
    USE_PROFILES: { html: true },
    FORBID_TAGS: FORBIDDEN_PREVIEW_TAGS,
    FORBID_ATTR: FORBIDDEN_PREVIEW_ATTRS,
    ALLOW_DATA_ATTR: false,
  });
}

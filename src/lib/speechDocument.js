/**
 * Prepares a lesson's rendered HTML for sentence-by-sentence reading.
 *
 * Input is the SAME sanitized HTML MarkdownRenderer would show (see
 * renderMarkdownToSafeHtml). Output is that HTML with every readable sentence
 * wrapped in `<span class="tts-chunk" data-tts-chunk="N">`, plus the matching
 * list of sentence strings to speak. The wrapping only exists in what's
 * rendered — the stored lesson content is never touched — and the markup is
 * otherwise identical, so the lesson looks exactly the same until a sentence
 * is highlighted.
 *
 * Readable text is found by the semantic elements Markdown produces
 * (headings, paragraphs, list items, block quotes, captions, table cells),
 * not by CSS classes or on-screen position. Code blocks, embedded media and
 * any interactive element are skipped.
 */

import { splitTextIntoChunks } from "./textToSpeech.js";

const BLOCK_TAGS = new Set([
  "H1", "H2", "H3", "H4", "H5", "H6",
  "P", "LI", "BLOCKQUOTE", "FIGCAPTION", "CAPTION",
  "DT", "DD", "TD", "TH", "SUMMARY", "DIV", "SECTION", "ARTICLE",
]);

// Never read: code listings, media and anything a student operates rather
// than reads. Inline <code> inside a sentence is still read.
const SKIP_TAGS = new Set([
  "PRE", "SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "SVG", "MATH",
  "IFRAME", "VIDEO", "AUDIO", "CANVAS", "OBJECT", "EMBED",
  "BUTTON", "INPUT", "SELECT", "TEXTAREA", "LABEL", "NAV", "FORM",
]);

function isSkipped(element, root) {
  for (let el = element; el && el !== root; el = el.parentElement) {
    if (SKIP_TAGS.has(el.tagName) || el.getAttribute?.("aria-hidden") === "true" || el.hasAttribute?.("hidden")) {
      return true;
    }
  }
  return false;
}

function blockOf(node, root) {
  for (let el = node.parentElement; el && el !== root; el = el.parentElement) {
    if (BLOCK_TAGS.has(el.tagName)) return el;
  }
  return root;
}

/**
 * Reading groups: runs of text nodes sharing one block element, in document
 * order. A `<br>` inside a block becomes a spoken break.
 */
function collectGroups(root) {
  const doc = root.ownerDocument;
  const walker = doc.createTreeWalker(root, 1 /* ELEMENT */ | 4 /* TEXT */);
  const groups = [];
  let current = null;
  let pendingBreak = false;

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeType === 1) {
      if (node.tagName === "BR") pendingBreak = true;
      if (SKIP_TAGS.has(node.tagName)) current = null;
      continue;
    }
    if (!node.nodeValue || isSkipped(node.parentElement, root)) continue;

    const block = blockOf(node, root);
    if (!current || current.block !== block) {
      current = { block, parts: [] };
      groups.push(current);
      pendingBreak = false;
    }
    current.parts.push({ node, joinBreak: pendingBreak && current.parts.length > 0 });
    pendingBreak = false;
  }
  return groups;
}

// Joins a group's text nodes into one string, remembering where each node
// starts so chunk ranges can be mapped back onto the nodes.
function groupText(group) {
  let text = "";
  const offsets = [];
  for (const part of group.parts) {
    if (part.joinBreak && text && !/\s$/.test(text)) text += " ";
    offsets.push(text.length);
    text += part.node.nodeValue;
  }
  return { text, offsets };
}

function wrapRange(doc, node, start, end, chunkIndex) {
  // Split the text node into [before][target][after] and wrap the target.
  let target = node;
  if (end < target.nodeValue.length) target.splitText(end);
  if (start > 0) target = target.splitText(start);
  const span = doc.createElement("span");
  span.className = "tts-chunk";
  span.setAttribute("data-tts-chunk", String(chunkIndex));
  target.parentNode.insertBefore(span, target);
  span.appendChild(target);
}

/**
 * @param {string} html  Sanitized HTML (never raw user input).
 * @param {{ lang?: string, indexOffset?: number }} options
 *   indexOffset — first chunk number to use, when the caller reads something
 *   (like the title) before the body.
 * @returns {{ html: string, chunks: string[] }}
 */
export function annotateHtmlForSpeech(html, { lang = "", indexOffset = 0 } = {}) {
  if (!html || typeof document === "undefined") return { html: html || "", chunks: [] };

  // A <template> is inert: nothing inside it loads or runs while we work.
  const template = document.createElement("template");
  template.innerHTML = html;
  const root = document.createElement("div");
  root.appendChild(template.content);

  const chunks = [];
  const wraps = []; // { node, start, end, chunkIndex } in node-local offsets

  let rowOfPreviousCell = null;
  for (const group of collectGroups(root)) {
    const { text, offsets } = groupText(group);
    const pieces = splitTextIntoChunks(text, lang);
    if (pieces.length === 0) continue;

    // Short table cells in one row are read as a single chunk ("Name, Age,
    // City") instead of one utterance per cell.
    const isCell = group.block.tagName === "TD" || group.block.tagName === "TH";
    const row = isCell ? group.block.parentElement : null;
    const joinsRow = isCell && row === rowOfPreviousCell && pieces.length === 1 && chunks.length > 0
      && (chunks[chunks.length - 1].length + pieces[0].text.length) < 200;
    rowOfPreviousCell = isCell ? row : null;

    pieces.forEach((piece, pieceIndex) => {
      let chunkIndex;
      if (joinsRow && pieceIndex === 0) {
        chunkIndex = indexOffset + chunks.length - 1;
        chunks[chunks.length - 1] = `${chunks[chunks.length - 1]}, ${piece.text}`;
      } else {
        chunkIndex = indexOffset + chunks.length;
        chunks.push(piece.text);
      }

      group.parts.forEach((part, partIndex) => {
        const nodeStart = offsets[partIndex];
        const nodeEnd = nodeStart + part.node.nodeValue.length;
        const start = Math.max(piece.start, nodeStart);
        const end = Math.min(piece.end, nodeEnd);
        if (end > start && part.node.nodeValue.slice(start - nodeStart, end - nodeStart).trim()) {
          wraps.push({ node: part.node, start: start - nodeStart, end: end - nodeStart, chunkIndex });
        }
      });
    });
  }

  // Wrap from the end of each node backwards so earlier offsets stay valid.
  const byNode = new Map();
  for (const w of wraps) {
    if (!byNode.has(w.node)) byNode.set(w.node, []);
    byNode.get(w.node).push(w);
  }
  for (const [node, list] of byNode) {
    list.sort((a, b) => b.start - a.start);
    let remaining = node;
    for (const w of list) {
      // `remaining` always holds [0, w.end) of the original node here.
      let target = remaining;
      if (w.end < target.nodeValue.length) target.splitText(w.end);
      if (w.start > 0) {
        const tail = target.splitText(w.start);
        wrapRange(document, tail, 0, tail.nodeValue.length, w.chunkIndex);
      } else {
        wrapRange(document, target, 0, target.nodeValue.length, w.chunkIndex);
      }
      remaining = node;
    }
  }

  return { html: root.innerHTML, chunks };
}

/**
 * Read-aloud text for uploaded documents — PDF pages and Word (.docx) files —
 * built from the structured data their viewers already have: pdf.js text
 * items (with on-page positions) and the docx parser's paragraph/run/table
 * elements. No screen scraping; pure functions, testable with plain `node`.
 */

import { splitTextIntoChunks } from "./textToSpeech.js";

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

/**
 * One PDF page's text as sentence chunks, remembering which text items (and
 * which characters of them) each chunk covers so it can be highlighted.
 *
 * @param {Array<{str?: string, hasEOL?: boolean, transform?: number[], width?: number, height?: number}>} items
 *   `textContent.items` from pdf.js `page.getTextContent()`.
 * @returns {{ chunks: string[], ranges: {start:number,end:number}[], items: {start:number,end:number,transform:number[],width:number,height:number}[] }}
 */
export function buildPdfPageSpeech(items, lang = "") {
  let text = "";
  const placed = [];
  // Where a new block (heading, paragraph) starts: a blank line, or text of a
  // clearly different size. PDFs carry no paragraph markup, and a heading
  // without a full stop would otherwise run straight into the next sentence.
  const blockStarts = [0];
  let lastFontSize = null;
  let pendingBlankLine = false;
  for (const item of items || []) {
    if (typeof item?.str !== "string") continue; // marked-content markers
    if (!item.str.trim()) {
      if (item.hasEOL && placed.length) pendingBlankLine = true;
    }
    if (item.str.trim()) {
      const t = item.transform || [1, 0, 0, 1, 0, 0];
      const fontSize = Math.hypot(t[2], t[3]) || item.height || 0;
      const sizeChanged = lastFontSize && fontSize && Math.abs(fontSize - lastFontSize) / lastFontSize > 0.15;
      if (placed.length && (pendingBlankLine || sizeChanged)) {
        if (text && !/\s$/.test(text)) text += " ";
        blockStarts.push(text.length);
      }
      pendingBlankLine = false;
      lastFontSize = fontSize || lastFontSize;
    }
    if (item.str) {
      // Separate words that pdf.js split into neighbouring items without a gap.
      if (text && !/\s$/.test(text) && !/^\s/.test(item.str)) {
        const prev = placed[placed.length - 1];
        if (prev && !prev.hyphenated) text += " ";
      }
      const start = text.length;
      text += item.str;
      placed.push({
        start,
        end: text.length,
        transform: item.transform || [1, 0, 0, 1, 0, 0],
        width: item.width || 0,
        height: item.height || 0,
        hyphenated: /[-‐]$/.test(item.str) && item.hasEOL,
      });
    }
    if (item.hasEOL && text && !/\s$/.test(text)) {
      // A line ending in a hyphen continues the word on the next line.
      const prev = placed[placed.length - 1];
      if (!prev?.hyphenated) text += " ";
    }
  }

  // Sentences never cross a block boundary.
  const pieces = blockStarts.flatMap((blockStart, i) => {
    const blockEnd = i + 1 < blockStarts.length ? blockStarts[i + 1] : text.length;
    return splitTextIntoChunks(text.slice(blockStart, blockEnd), lang).map((p) => ({
      text: p.text,
      start: p.start + blockStart,
      end: p.end + blockStart,
    }));
  });
  return {
    chunks: pieces.map((p) => p.text),
    ranges: pieces.map(({ start, end }) => ({ start, end })),
    items: placed.map(({ start, end, transform, width, height }) => ({ start, end, transform, width, height })),
  };
}

// [a b c d e f] affine matrices, same convention as pdf.js Util.transform.
function multiply(m1, m2) {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}

/**
 * On-page rectangles (CSS pixels, relative to the rendered page's top-left)
 * covering one chunk. Partial items are cut proportionally by character, which
 * is close enough for a reading highlight.
 *
 * @param {ReturnType<typeof buildPdfPageSpeech>} pageSpeech
 * @param {number} chunkIndex
 * @param {number[]} baseViewportTransform  `page.getViewport({ scale: 1 }).transform`
 * @param {number} scale  Rendered width / unscaled page width.
 */
export function pdfChunkRects(pageSpeech, chunkIndex, baseViewportTransform, scale) {
  const range = pageSpeech?.ranges?.[chunkIndex];
  if (!range || !baseViewportTransform || !scale) return [];
  const viewport = baseViewportTransform.map((v) => v * scale);

  const rects = [];
  for (const item of pageSpeech.items) {
    const start = Math.max(range.start, item.start);
    const end = Math.min(range.end, item.end);
    if (end <= start) continue;
    const length = item.end - item.start || 1;
    const m = multiply(viewport, item.transform);
    const fontHeight = Math.hypot(m[2], m[3]) || item.height * scale;
    const fullWidth = item.width * scale;
    const left = m[4] + fullWidth * ((start - item.start) / length);
    const width = fullWidth * ((end - start) / length);
    if (width <= 0) continue;
    rects.push({ left, top: m[5] - fontHeight, width, height: fontHeight * 1.15 });
  }
  return rects;
}

// ---------------------------------------------------------------------------
// Word (.docx)
// ---------------------------------------------------------------------------

/**
 * Sentence chunks for a parsed .docx, plus how to render each paragraph's runs
 * split at sentence boundaries so every sentence can carry its chunk number.
 * Tables are read a row at a time ("Name, Age"); images are skipped.
 *
 * @param {Array} elements  `parseDocxArrayBuffer(...).elements`
 * @returns {{
 *   chunks: string[],
 *   paragraphs: Record<number, Array<{ runIndex: number, text: string, chunkIndex: number | null }>>,
 *   rows: Record<string, number>
 * }}
 *   paragraphs — keyed by element index; rows — `${elementIndex}:${rowIndex}` → chunk
 */
export function buildDocxSpeech(elements, lang = "") {
  const chunks = [];
  const paragraphs = {};
  const rows = {};

  (elements || []).forEach((elem, elemIndex) => {
    if (elem?.type === "paragraph") {
      const runs = elem.runs || [];
      let text = "";
      const runStarts = runs.map((run) => {
        const start = text.length;
        text += run?.text || "";
        return start;
      });
      const pieces = splitTextIntoChunks(text, lang);
      const base = chunks.length;
      pieces.forEach((p) => chunks.push(p.text));

      const segments = [];
      runs.forEach((run, runIndex) => {
        const runText = run?.text || "";
        const runStart = runStarts[runIndex];
        const runEnd = runStart + runText.length;
        // Cut points inside this run: every chunk start/end that falls within it.
        const cuts = new Set([runStart, runEnd]);
        pieces.forEach((p) => {
          if (p.start > runStart && p.start < runEnd) cuts.add(p.start);
          if (p.end > runStart && p.end < runEnd) cuts.add(p.end);
        });
        const sorted = [...cuts].sort((a, b) => a - b);
        for (let i = 0; i < sorted.length - 1; i++) {
          const from = sorted[i];
          const to = sorted[i + 1];
          const pieceIndex = pieces.findIndex((p) => from >= p.start && to <= p.end);
          segments.push({
            runIndex,
            text: text.slice(from, to),
            chunkIndex: pieceIndex >= 0 ? base + pieceIndex : null,
          });
        }
      });
      paragraphs[elemIndex] = segments;
    } else if (elem?.type === "table") {
      (elem.rows || []).forEach((row, rowIndex) => {
        const cells = (row || []).map((c) => String(c ?? "").replace(/\s+/g, " ").trim()).filter(Boolean);
        if (cells.length === 0) return;
        rows[`${elemIndex}:${rowIndex}`] = chunks.length;
        chunks.push(cells.join(", "));
      });
    }
  });

  return { chunks, paragraphs, rows };
}

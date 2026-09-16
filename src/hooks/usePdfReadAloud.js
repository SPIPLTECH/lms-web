"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import useTextToSpeech from "@/hooks/useTextToSpeech";
import { buildPdfPageSpeech, pdfChunkRects } from "@/lib/documentSpeech";

/**
 * Read aloud for a PDF shown one page at a time (PdfViewer).
 *
 * Listen reads the page on screen sentence by sentence, then turns to the next
 * page with text and carries on, to the end of the document. Turning the page
 * yourself stops it. Text and positions come from pdf.js (`getTextContent`),
 * so the highlight is drawn as boxes over the rendered page — it follows zoom
 * and never depends on a text layer. Scanned PDFs have no text to read; the
 * player says so instead of failing.
 *
 * @param {object} args
 * @param {boolean} args.enabled
 * @param {string}  args.sessionKey   Stable id of the document.
 * @param {string}  args.lang
 * @param {React.MutableRefObject<any>} args.pdfRef  The loaded pdf.js document.
 * @param {number}  args.numPages
 * @param {number}  args.pageNumber
 * @param {(page: number) => void} args.setPageNumber
 * @param {number}  args.renderWidth  CSS width the page is rendered at.
 */
export default function usePdfReadAloud({ enabled, sessionKey, lang, pdfRef, numPages, pageNumber, setPageNumber, renderWidth }) {
  const speech = useTextToSpeech(enabled && sessionKey ? `pdf:${sessionKey}` : null);
  const cacheRef = useRef(new Map()); // page -> { speech, baseTransform, baseWidth }
  const readingPageRef = useRef(null);
  const [notice, setNotice] = useState("");
  const [pageData, setPageData] = useState(null); // data for the page on screen

  // A different document starts from a clean cache.
  useEffect(() => {
    cacheRef.current = new Map();
    readingPageRef.current = null;
    setNotice("");
  }, [sessionKey, numPages]);

  const loadPage = useCallback(
    async (page) => {
      const cached = cacheRef.current.get(page);
      if (cached) return cached;
      const pdf = pdfRef.current;
      if (!pdf) return null;
      const pdfPage = await pdf.getPage(page);
      const content = await pdfPage.getTextContent();
      const viewport = pdfPage.getViewport({ scale: 1 });
      const data = {
        speech: buildPdfPageSpeech(content.items, lang),
        baseTransform: viewport.transform,
        baseWidth: viewport.width,
      };
      cacheRef.current.set(page, data);
      return data;
    },
    [pdfRef, lang]
  );

  // Extract the visible page ahead of time, so Listen can start speaking
  // synchronously inside the tap (iOS only allows speech started by a gesture).
  useEffect(() => {
    if (!enabled || !numPages || !speech.supported) return undefined;
    let cancelled = false;
    loadPage(pageNumber)
      .then((data) => {
        if (!cancelled) setPageData(data);
      })
      .catch(() => {
        if (!cancelled) setPageData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, numPages, pageNumber, loadPage, speech.supported]);

  const startPage = useCallback(
    (page, data) => {
      readingPageRef.current = page;
      setNotice("");
      speech.start(data.speech.chunks, { lang });
    },
    [speech, lang]
  );

  // First page at or after `from` that has any text.
  const findReadablePage = useCallback(
    async (from) => {
      for (let page = from; page <= (numPages || 0); page++) {
        const data = await loadPage(page);
        if (data?.speech.chunks.length) return { page, data };
      }
      return null;
    },
    [loadPage, numPages]
  );

  const listen = useCallback(async () => {
    const cached = cacheRef.current.get(pageNumber);
    if (cached?.speech.chunks.length) {
      startPage(pageNumber, cached);
      return;
    }
    try {
      const found = await findReadablePage(pageNumber);
      if (!found) {
        setNotice("There's no readable text on this page or the pages after it. It may be a scanned image.");
        return;
      }
      if (found.page !== pageNumber) {
        readingPageRef.current = found.page;
        setPageNumber(found.page);
      }
      startPage(found.page, found.data);
    } catch {
      setNotice("This document's text couldn't be read aloud.");
    }
  }, [pageNumber, findReadablePage, startPage, setPageNumber]);

  // Finished a page: continue on the next page with text.
  const { isCompleted } = speech;
  useEffect(() => {
    if (!isCompleted || !readingPageRef.current) return undefined;
    const current = readingPageRef.current;
    if (current >= (numPages || 0)) return undefined;
    let cancelled = false;
    findReadablePage(current + 1)
      .then((found) => {
        if (cancelled || !found) return;
        readingPageRef.current = found.page;
        setPageNumber(found.page);
        startPage(found.page, found.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // Only a fresh completion should trigger the page turn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCompleted]);

  // The student turned the page themselves — stop reading the old one.
  const { isEngaged, stop } = speech;
  useEffect(() => {
    if (isEngaged && readingPageRef.current && readingPageRef.current !== pageNumber) {
      readingPageRef.current = null;
      stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNumber]);

  const highlightRects = useMemo(() => {
    if (!(speech.isPlaying || speech.isPaused)) return [];
    if (readingPageRef.current !== pageNumber || !pageData) return [];
    const scale = renderWidth / pageData.baseWidth;
    return pdfChunkRects(pageData.speech, speech.index, pageData.baseTransform, scale);
  }, [speech.isPlaying, speech.isPaused, speech.index, pageNumber, pageData, renderWidth]);

  return {
    speech,
    listen,
    notice,
    highlightRects,
    // Show the player once the document has loaded; a page without text is
    // reported through `notice` when Listen is pressed.
    available: enabled && speech.supported && Boolean(numPages),
  };
}

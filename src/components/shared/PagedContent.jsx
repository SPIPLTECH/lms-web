"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

// Space between two pages in the flow. Never on screen (the window shows one
// page at a time); it only keeps the next page's first letters out of view.
const PAGE_GAP = 48;

// Block-level things a reader would call "where I was" — used to keep the
// same passage on screen when the page size changes and the text reflows.
const ANCHOR_SELECTOR = "p, li, h1, h2, h3, h4, h5, h6, pre, blockquote, figure, img, table, tr";

/**
 * Lays long reading content out as pages that exactly fit the box it is given,
 * instead of a column that scrolls. The flow is a one-column multicol box with
 * a fixed height: content that does not fit continues in further columns to
 * the right, each one exactly a page wide, and the window in front of it is
 * moved a whole page at a time. Text reflows — nothing is scaled down and
 * nothing is cut off.
 *
 * The window is `overflow: clip`, which (unlike `hidden`) is not a scroll
 * container: a wheel, a trackpad or focusing a link on another page cannot
 * scroll it behind the pager's back. Focus moving onto another page turns to
 * it, and so does read-aloud, through revealInScrollParent.
 *
 * Page state is reported through onPageStateChange in the same shape
 * PdfViewer uses, so the host shows one "Page X of Y" control for both.
 */
export default function PagedContent({ children, onPageStateChange, maxPageWidth = 896 }) {
  const windowRef = useRef(null);
  const flowRef = useRef(null);
  const endRef = useRef(null);
  // The element the reader is on. Kept across reflows so a resize (the Course
  // Map or header sliding in or out) keeps that passage on screen.
  const anchorRef = useRef(null);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });

  const pageIndexRef = useRef(0);
  const pageCountRef = useRef(1);
  useEffect(() => {
    pageIndexRef.current = pageIndex;
    pageCountRef.current = pageCount;
  }, [pageIndex, pageCount]);

  // Which page an element starts on. Both rects carry the same translate, so
  // their difference is the element's position in the untransformed flow.
  const pageOf = useCallback((element) => {
    const win = windowRef.current;
    const flow = flowRef.current;
    if (!win || !flow || !element || win.clientWidth <= 0) return 0;
    const offset = element.getBoundingClientRect().left - flow.getBoundingClientRect().left;
    return Math.max(0, Math.floor((offset + 1) / (win.clientWidth + PAGE_GAP)));
  }, []);

  const measure = useCallback(() => {
    const win = windowRef.current;
    if (!win || win.clientWidth <= 0) return;
    const count = pageOf(endRef.current) + 1;
    setPageSize((prev) =>
      prev.width === win.clientWidth && prev.height === win.clientHeight
        ? prev
        : { width: win.clientWidth, height: win.clientHeight }
    );
    setPageCount(count);
    const anchor = anchorRef.current;
    setPageIndex((current) =>
      Math.min(anchor && flowRef.current?.contains(anchor) ? pageOf(anchor) : current, count - 1)
    );
  }, [pageOf]);

  // Every render can change the flow (new markup, read-aloud highlighting),
  // so re-measure after each one. Setting the same values bails out, so this
  // settles instead of looping.
  useLayoutEffect(() => {
    measure();
  });

  // Size changes (the frame growing as the header or Course Map collapse) and
  // late-loading images move the page breaks without a render of our own.
  useEffect(() => {
    const win = windowRef.current;
    const flow = flowRef.current;
    if (!win || !flow || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(win);
    flow.addEventListener("load", measure, true);
    return () => {
      observer.disconnect();
      flow.removeEventListener("load", measure, true);
    };
  }, [measure]);

  const goToPage = useCallback(
    (index) => {
      const flow = flowRef.current;
      const next = Math.min(Math.max(0, index), pageCountRef.current - 1);
      anchorRef.current =
        Array.from(flow?.querySelectorAll(ANCHOR_SELECTOR) || []).find((el) => pageOf(el) === next) || null;
      setPageIndex(next);
    },
    [pageOf]
  );

  // Turn to whatever needs to be seen: a focused link on another page, or
  // the sentence read-aloud has moved on to (revealInScrollParent dispatches
  // "paged-content:reveal" instead of scrolling when it is inside a pager).
  useEffect(() => {
    const win = windowRef.current;
    if (!win) return;
    const reveal = (event) => {
      const target = event.target;
      if (!(target instanceof Element) || target === win) return;
      const page = pageOf(target);
      if (page === pageIndexRef.current) return;
      anchorRef.current = target;
      setPageIndex(Math.min(page, pageCountRef.current - 1));
    };
    win.addEventListener("paged-content:reveal", reveal);
    win.addEventListener("focusin", reveal);
    return () => {
      win.removeEventListener("paged-content:reveal", reveal);
      win.removeEventListener("focusin", reveal);
    };
  }, [pageOf]);

  const onPageStateChangeRef = useRef(onPageStateChange);
  useEffect(() => {
    onPageStateChangeRef.current = onPageStateChange;
  }, [onPageStateChange]);

  useEffect(() => {
    onPageStateChangeRef.current?.(
      pageCount > 1
        ? {
            page: pageIndex + 1,
            total: pageCount,
            goToPreviousPage: () => goToPage(pageIndexRef.current - 1),
            goToNextPage: () => goToPage(pageIndexRef.current + 1),
          }
        : null
    );
  }, [pageIndex, pageCount, goToPage]);

  useEffect(() => () => onPageStateChangeRef.current?.(null), []);

  return (
    <div className="flex-1 min-h-0 w-full flex justify-center px-4 py-4 sm:px-8 sm:py-6">
      {/* Rules that only make sense on a page: media never taller than one,
          code and tables wrap to the page width rather than scrolling
          sideways, and small things are not split across two pages. The
          !important ones override the reading styles' own scrollers
          (MarkdownRenderer's pre/table wrappers, DocxViewer's tables). */}
      <style>{`
        .paged-flow img, .paged-flow video, .paged-flow svg, .paged-flow canvas, .paged-flow iframe {
          max-width: 100%;
          max-height: calc(var(--paged-page-height, 100vh) - 1rem);
          object-fit: contain;
        }
        .paged-flow img, .paged-flow figure, .paged-flow tr, .paged-flow blockquote {
          break-inside: avoid;
        }
        .paged-flow h1, .paged-flow h2, .paged-flow h3, .paged-flow h4, .paged-flow h5, .paged-flow h6 {
          break-after: avoid;
        }
        .paged-flow pre, .paged-flow pre code {
          white-space: pre-wrap !important;
          overflow-wrap: anywhere !important;
          word-break: break-word !important;
          overflow: visible !important;
        }
        .paged-flow .md-table-wrapper, .paged-flow .overflow-x-auto {
          overflow: visible !important;
        }
        .paged-flow table {
          table-layout: fixed;
          width: 100% !important;
        }
        .paged-flow td, .paged-flow th {
          overflow-wrap: anywhere;
        }
      `}</style>
      <div
        ref={windowRef}
        data-paged-content=""
        className="h-full w-full min-w-0 overflow-clip"
        style={{ maxWidth: maxPageWidth }}
      >
        <div
          ref={flowRef}
          className="paged-flow h-full motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out"
          style={{
            columnCount: 1,
            columnGap: PAGE_GAP,
            columnFill: "auto",
            transform: `translateX(${-pageIndex * (pageSize.width + PAGE_GAP)}px)`,
            "--paged-page-height": `${pageSize.height}px`,
          }}
        >
          {children}
          {/* End marker: the page it lands on is the last page. */}
          <div ref={endRef} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

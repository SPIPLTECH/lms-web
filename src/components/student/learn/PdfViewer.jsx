"use client";

import { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  AlertCircle,
  Loader2,
  FileText,
} from "lucide-react";

import { getDisplayUrl } from "@/lib/blob";

// Serve the PDF.js worker from this app's own static assets (bundled from the
// installed pdfjs-dist, so its version always matches the API) rather than
// unpkg.com: no extra third-party connection before the first PDF page can
// render, and no dependency on that CDN being up.
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
}

const MIN_ZOOM = 0.5; // 50%
const MAX_ZOOM = 2.5; // 250%
const ZOOM_STEP = 0.15;

export default function PdfViewer({
  fileUrl,
  title,
  className = "",
  hideToolbar = false,
  // Opt-in (the learn player below xl): instead of the standalone
  // reading-pane sizing, fill exactly the height the parent allots and let
  // THIS viewport be the scroll container. Without it the viewer grows past
  // the player frame, which hands scrolling back to the frame and pushes the
  // page bar below the fold — the whole point of the fill.
  fillHeight = false,
  // Reports this document's page STATE and handlers upward so consumers can
  // draw the controls wherever they belong — the indicator in the document
  // header, the buttons below the player — without ever owning the page
  // state themselves. Lifting data rather than a rendered node is what lets
  // two different places drive the same single set of handlers. Called with
  // null when there is nothing to navigate (single-page, or the standalone
  // toolbar mode, which has its own page controls in its own header).
  onPageStateChange = null,
  onControlsRender,
}) {
  const resolvedUrl = getDisplayUrl(fileUrl);

  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Container measurement & zoom state
  const [containerWidth, setContainerWidth] = useState(0);
  const [isFitToWidth, setIsFitToWidth] = useState(true);
  const [customScale, setCustomScale] = useState(1.0); // Multiplier when manual zoom is used
  const [isMounted, setIsMounted] = useState(false);

  const containerRef = useRef(null);
  const viewportRef = useRef(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Responsive container measurement using ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;

    const measureContainer = () => {
      if (containerRef.current) {
        // Measure exact available inner width excluding outer border/padding
        const width = containerRef.current.clientWidth;
        const padding = width < 640 ? 12 : 24;
        const available = Math.max(width - padding, 0);
        // The floor guards only the pre-layout case where clientWidth is
        // still 0. It used to apply unconditionally, which meant a viewer
        // sitting in a container narrower than 260px rendered its page wider
        // than its own box and pushed the whole page sideways — exactly the
        // horizontal overflow this must not cause.
        setContainerWidth(available > 0 ? available : 260);
      }
    };

    measureContainer();
    const observer = new ResizeObserver(measureContainer);
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [isMounted]);

  // Keep pageInput synced with pageNumber
  useEffect(() => {
    setPageInput(String(pageNumber));
  }, [pageNumber]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
    setLoading(false);
    setError(null);
  };

  const onDocumentLoadError = (err) => {
    console.error("[PDF VIEWER] Document Load Error:", err);
    setLoading(false);
    setError(err?.message || "Failed to load PDF document.");
  };

  const changePage = (offset) => {
    setPageNumber((prev) => {
      const next = Math.min(Math.max(1, prev + offset), numPages || 1);
      if (viewportRef.current) {
        viewportRef.current.scrollTop = 0;
      }
      return next;
    });
  };

  // In hideToolbar mode the page nav lifted into the parent's document
  // header is the ONLY thing that changes the page. It replaces an earlier click-to-turn region that
  // treated the whole left/right half of the viewport as previous/next page:
  // on the learn page the lesson's own Previous/Next content controls are
  // overlaid at those same left and right edges, so one tap meant two
  // different kinds of navigation depending on a few pixels, with no page
  // indicator to tell them apart. An explicit, labelled control cannot be
  // confused with lesson navigation, and leaves the viewport free to scroll.
  const showPageNav = hideToolbar && (numPages || 0) > 1;

  // Height of the scrolling canvas. Both branches are literal class strings —
  // Tailwind only generates classes it can see verbatim in the source, so
  // these must never be built by string concatenation.
  //
  // fillHeight (the learn player): below xl take whatever height the parent
  // column leaves and scroll here, so the document header above stays put; at
  // xl the original reading-pane sizing applies.
  // Otherwise: the original sizing at every width.
  // The two branches never overlap, so no rule depends on stylesheet order.
  const viewportSizing = fillHeight
    ? "flex-1 xl:flex-none xl:h-[82vh] xl:min-h-[560px] xl:max-h-[950px]"
    : "h-auto max-h-[70vh] sm:h-[82vh] sm:min-h-[560px] sm:max-h-[950px]";

  const handlePageInputChange = (e) => {
    setPageInput(e.target.value);
  };

  const handlePageInputSubmit = (e) => {
    if (e.key === "Enter") {
      const parsed = parseInt(pageInput, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= (numPages || 1)) {
        setPageNumber(parsed);
        if (viewportRef.current) viewportRef.current.scrollTop = 0;
      } else {
        setPageInput(String(pageNumber));
      }
    }
  };

  // Zoom Action Handlers
  const handleZoomIn = () => {
    setIsFitToWidth(false);
    setCustomScale((prev) => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  };

  const handleZoomOut = () => {
    setIsFitToWidth(false);
    setCustomScale((prev) => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
  };

  const handleFitToWidth = () => {
    setIsFitToWidth(true);
    setCustomScale(1.0);
  };

  // Calculate final page width for react-pdf Page component
  const baseWidth = containerWidth ? Math.min(containerWidth, 1400) : 600;
  const renderPageWidth = isFitToWidth ? baseWidth : Math.round(baseWidth * customScale);

  // Effective display zoom percentage
  const effectiveZoomPercentage = isFitToWidth
    ? 100
    : Math.round(customScale * 100);

  // Reusable Controls Bar JSX (used inside inner toolbar or passed to parent header)
  const controlsNode = (
    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
      {/* Page Navigation */}
      {numPages && (
        <div className="flex items-center gap-1 rounded-xl bg-background border border-border px-2 py-1">
          <button
            type="button"
            onClick={() => changePage(-1)}
            disabled={pageNumber <= 1}
            className="rounded-lg p-1 text-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition cursor-pointer"
            title="Previous Page"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="flex items-center gap-1 text-sm font-semibold text-foreground font-mono">
            <input
              type="text"
              value={pageInput}
              onChange={handlePageInputChange}
              onKeyDown={handlePageInputSubmit}
              className="w-8 rounded bg-background border border-transparent px-1 py-0.5 text-center text-sm font-bold text-foreground focus:outline-none focus:border-primary font-mono"
              title="Type page number and press Enter"
            />
            <span className="text-muted-foreground">/</span>
            <span className="text-foreground">{numPages}</span>
          </div>

          <button
            type="button"
            onClick={() => changePage(1)}
            disabled={pageNumber >= numPages}
            className="rounded-lg p-1 text-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition cursor-pointer"
            title="Next Page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Zoom Model Controls */}
      <div className="flex items-center gap-1 rounded-xl bg-background border border-border px-2 py-1">
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={!isFitToWidth && customScale <= MIN_ZOOM}
          className="rounded-lg p-1 text-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition cursor-pointer"
          title="Zoom Out (-15%)"
        >
          <ZoomOut size={15} />
        </button>

        <span className="text-[13px] font-semibold text-foreground min-w-[36px] text-center font-mono">
          {isFitToWidth ? "Fit" : `${effectiveZoomPercentage}%`}
        </span>

        <button
          type="button"
          onClick={handleZoomIn}
          disabled={!isFitToWidth && customScale >= MAX_ZOOM}
          className="rounded-lg p-1 text-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition cursor-pointer"
          title="Zoom In (+15%)"
        >
          <ZoomIn size={15} />
        </button>

        {/* Fit to Width Button */}
        {!isFitToWidth && (
          <button
            type="button"
            onClick={handleFitToWidth}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[13px] font-bold text-primary hover:bg-primary/10 border border-primary/30 transition cursor-pointer"
            title="Fit to Width"
          >
            <Maximize2 size={12} />
            <span className="hidden sm:inline">Fit</span>
          </button>
        )}
      </div>

      {/* Download Button */}
      <a
        href={resolvedUrl || fileUrl}
        download
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 rounded-xl bg-primary hover:bg-orange-600 px-3 py-1.5 text-sm font-extrabold text-slate-950 transition cursor-pointer shadow-md"
        title="Download PDF Document"
      >
        <Download size={14} />
        <span className="hidden sm:inline">Download</span>
      </a>
    </div>
  );

  // The document's own page handlers. changePage is the single source of
  // page movement — it updates pageNumber and nothing else, so nothing here
  // can reach the lesson's content navigation.
  const goToPreviousPage = () => changePage(-1);
  const goToNextPage = () => changePage(1);

  const onPageStateChangeRef = useRef(onPageStateChange);
  useEffect(() => {
    onPageStateChangeRef.current = onPageStateChange;
  }, [onPageStateChange]);

  // Re-report whenever the page or the document changes. The handlers close
  // over changePage, which uses a functional setState, so they stay correct
  // without being listed here.
  useEffect(() => {
    onPageStateChangeRef.current?.(
      showPageNav
        ? { page: pageNumber, total: numPages, goToPreviousPage, goToNextPage }
        : null
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPageNav, pageNumber, numPages]);

  const onControlsRenderRef = useRef(onControlsRender);
  useEffect(() => {
    onControlsRenderRef.current = onControlsRender;
  }, [onControlsRender]);

  // Notify parent of rendered controls when onControlsRender callback is supplied
  useEffect(() => {
    if (onControlsRenderRef.current) {
      onControlsRenderRef.current(controlsNode);
    }
  }, [
    numPages,
    pageNumber,
    pageInput,
    isFitToWidth,
    customScale,
    effectiveZoomPercentage,
    resolvedUrl,
    fileUrl,
  ]);

  if (!isMounted) {
    return (
      <div className="flex h-96 w-full items-center justify-center rounded-2xl border border-border bg-[#0B101D]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!fileUrl) {
    return (
      <div className="flex h-80 w-full flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-[#0B101D] p-6 text-center">
        <AlertCircle className="h-10 w-10 text-amber-500" />
        <h4 className="text-base font-bold text-foreground">No PDF File Provided</h4>
        <p className="text-sm text-muted-foreground">Please select a valid PDF content item.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      /* min-w-0 / max-w-full keep the viewer inside its flex parent rather
         than letting the rendered page size it. */
      className={`flex flex-col w-full min-w-0 max-w-full ${
        !hideToolbar
          ? "rounded-2xl border border-border bg-[#0B101D] shadow-2xl overflow-hidden"
          : ""
      } ${fillHeight ? "max-xl:h-full max-xl:min-h-0" : ""} ${className}`}
    >
      {/* Standalone Header Toolbar (rendered ONLY when hideToolbar is false) */}
      {!hideToolbar && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border/80 bg-[#0D1222] px-3.5 py-2.5 text-foreground rounded-t-2xl">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 border border-primary/30 text-primary shrink-0">
              <FileText size={15} />
            </div>
            <span className="text-sm font-bold text-foreground truncate max-w-[160px] sm:max-w-xs md:max-w-md">
              {title || "PDF Document"}
            </span>
          </div>

          {controlsNode}
        </div>
      )}

      {/* PDF CANVAS VIEWPORT CONTAINER */}
      <div
        ref={viewportRef}
        /* The fixed 82vh height with a 560px floor is a reading-pane size that
           only makes sense once the page is large enough to read. Fitted into
           a phone-width column the page is ~300px tall, so that floor wrapped
           it in roughly as much empty backdrop again. Below sm the viewport is
           content-height instead, capped at 70vh so a zoomed page still
           scrolls here rather than stretching the block.
           When the page bar is shown the viewport gives back exactly the
           height the bar takes, so adding it never changes the viewer's
           overall footprint. */
        className={`relative w-full min-h-0 overflow-auto bg-[#060913] p-2 sm:p-3.5 flex justify-center items-start scroll-smooth rounded-2xl border border-border/80 ${viewportSizing}`}
      >
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#060913]/90 z-20 rounded-2xl">
            <Loader2 className="h-9 w-9 animate-spin text-primary" />
            <p className="text-sm font-bold text-foreground">Rendering PDF Document…</p>
          </div>
        )}

        {/* Error State */}
        {error ? (
          <div className="my-12 flex flex-col items-center justify-center gap-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-8 text-center max-w-md">
            <AlertCircle className="h-10 w-10 text-rose-400" />
            <div>
              <h4 className="text-base font-bold text-foreground mb-1">Unable to Render PDF</h4>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{error}</p>
            </div>
            <a
              href={resolvedUrl || fileUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-orange-600 px-5 py-2.5 text-sm font-bold text-slate-950 transition shadow-lg"
            >
              <Download size={15} />
              <span>Download File Instead</span>
            </a>
          </div>
        ) : (
          /* PDF Document Rendering with Native Pixel Width */
          <Document
            file={resolvedUrl || fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm font-semibold text-muted-foreground">Loading document pages…</span>
              </div>
            }
            className="flex flex-col items-center max-w-full"
          >
            {/* Zooming past 100% deliberately renders the page wider than the
                viewer. That overflow scrolls here, inside the document, so it
                never becomes horizontal scrolling on the page itself. */}
            <div className="my-auto py-1.5 transition-all duration-150 flex justify-center max-w-full overflow-x-auto">
              <Page
                pageNumber={pageNumber}
                width={renderPageWidth}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                className="shadow-2xl rounded-lg overflow-hidden border border-transparent/60 bg-white"
              />
            </div>
          </Document>
        )}
      </div>
    </div>
  );
}
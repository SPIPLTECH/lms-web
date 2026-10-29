"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
import { revealInScrollParent } from "@/lib/revealInScrollParent";
import SpeechControls from "@/components/student/tts/SpeechControls";
import usePdfReadAloud from "@/hooks/usePdfReadAloud";

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
// Touch zoom (the learn player on a phone) never goes below fit-to-width —
// a page narrower than the screen helps nobody there — and steps faster.
const TOUCH_ZOOM_STEP = 0.25;
const clampTouchZoom = (scale) => Math.min(Math.max(scale, 1), MAX_ZOOM);

export default function PdfViewer({
  fileUrl,
  title,
  className = "",
  hideToolbar = false,
  showDownload = false,
  // Opt-in (the learn player below xl): instead of the standalone
  // reading-pane sizing, fill exactly the height the parent allots and let
  // THIS viewport be the scroll container.
  fillHeight = false,
  // Reports this document's page STATE and handlers upward so consumers can
  // draw the controls wherever they belong — the indicator in the document
  // header, the buttons below the player — without ever owning the page
  // state themselves.
  onPageStateChange = null,
  onControlsRender,
  // Opt-in read aloud for the student player: { sessionKey, lang }.
  readAloud = null,
  // Opt-in (the learn player below xl): a fitted A4 page is unreadable on a
  // phone, so the page can be pinched to zoom and has a small −/Fit/+
  // control of its own; a zoomed page scrolls in both directions.
  touchZoom = false,
}) {
  const resolvedUrl = getDisplayUrl(fileUrl);

  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Container measurement & zoom state
  const [containerWidth, setContainerWidth] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [pageAspect, setPageAspect] = useState(null);
  const [isFitToWidth, setIsFitToWidth] = useState(true);
  const [customScale, setCustomScale] = useState(1.0); // Multiplier when manual zoom is used
  const [isMounted, setIsMounted] = useState(false);

  const containerRef = useRef(null);
  const viewportRef = useRef(null);
  // The loaded pdf.js document, for text extraction (read aloud).
  const pdfRef = useRef(null);
  const highlightRef = useRef(null);
  // Touch zoom: the page box, the pinch in progress (its start distance,
  // starting scale and the page point under the fingers), the CSS scale shown
  // while pinching, and the point to keep in place once the page re-renders.
  const pageBoxRef = useRef(null);
  const pinchRef = useRef(null);
  const [pinchScale, setPinchScale] = useState(1);
  const zoomAnchorRef = useRef(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Responsive container measurement using ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;

    const measureContainer = () => {
      const target = viewportRef.current || containerRef.current;
      if (target) {
        // Measure exact available inner width excluding outer border/padding
        const width = target.clientWidth;
        const padding = width < 640 ? 16 : 32;
        const available = Math.max(width - padding, 0);
        setContainerWidth(available > 0 ? available : 260);
      }
      if (fillHeight && viewportRef.current) {
        const viewport = viewportRef.current;
        const cs = window.getComputedStyle(viewport);
        const usable =
          viewport.clientHeight -
          (parseFloat(cs.paddingTop) || 0) -
          (parseFloat(cs.paddingBottom) || 0) -
          24;
        setViewportHeight(Math.max(usable, 0));
      }
    };

    measureContainer();
    const observer = new ResizeObserver(measureContainer);
    observer.observe(containerRef.current);
    if (fillHeight && viewportRef.current) observer.observe(viewportRef.current);

    return () => observer.disconnect();
  }, [isMounted, fillHeight]);

  // Keep pageInput synced with pageNumber
  useEffect(() => {
    setPageInput(String(pageNumber));
  }, [pageNumber]);

  const onDocumentLoadSuccess = (pdf) => {
    pdfRef.current = pdf;
    setNumPages(pdf.numPages);
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

  const showPageNav = hideToolbar && (numPages || 0) > 1;

  // Viewport sizing:
  // When fillHeight is true, take the full height allotted by the parent and let
  // THIS viewport be the scroll container (overflow-y-auto).
  // Otherwise, standalone reading-pane sizing.
  const viewportSizing = fillHeight
    ? "flex-1 min-h-0 overflow-y-auto overflow-x-auto"
    : "overflow-auto h-auto max-h-[70vh] sm:h-[82vh] sm:min-h-[560px] sm:max-h-[950px]";

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
  const availableWidth = containerWidth ? Math.min(containerWidth, 1400) : 600;

  // Sizing strategy:
  // For landscape documents (aspect > 1.15, e.g. slides), fit whole page inside viewport if possible.
  // For portrait documents (aspect <= 1.15, e.g. A4/Letter sheets), scale comfortably to available width
  // (capped at a readable maximum of 960px on wide screens) and let the viewport scroll vertically.
  const isLandscape = Boolean(pageAspect && pageAspect > 1.15);
  const fitWidth =
    isLandscape && fillHeight && viewportHeight > 0
      ? Math.min(availableWidth, Math.floor(viewportHeight * pageAspect))
      : Math.min(availableWidth, 960);

  const renderPageWidth = isFitToWidth ? fitWidth : Math.round(fitWidth * customScale);

  // ---- Touch zoom (touchZoom only) ------------------------------------------
  const touchScale = isFitToWidth ? 1 : customScale;
  const isZoomedIn = touchZoom && touchScale > 1;
  const touchScaleRef = useRef(touchScale);
  useEffect(() => {
    touchScaleRef.current = touchScale;
  }, [touchScale]);

  // `anchor` ({ fx, fy, vx, vy }): the page point (as fractions of the page)
  // to keep at viewport point (vx, vy) once the page re-renders at the new size.
  const applyTouchZoom = useCallback((scale, anchor = null) => {
    const next = clampTouchZoom(scale);
    zoomAnchorRef.current = anchor;
    if (next <= 1.001) {
      setIsFitToWidth(true);
      setCustomScale(1);
    } else {
      setIsFitToWidth(false);
      setCustomScale(next);
    }
  }, []);

  // The buttons zoom around the middle of what is on screen.
  const centreAnchor = () => {
    const viewport = viewportRef.current;
    const box = pageBoxRef.current;
    if (!viewport || !box || !box.offsetWidth) return null;
    const vx = viewport.clientWidth / 2;
    const vy = viewport.clientHeight / 2;
    return {
      fx: (viewport.scrollLeft + vx - box.offsetLeft) / box.offsetWidth,
      fy: (viewport.scrollTop + vy - box.offsetTop) / box.offsetHeight,
      vx,
      vy,
    };
  };

  // Run once the page has re-rendered at the new size (Page onRenderSuccess):
  // before that the viewport has nothing wider to scroll to.
  const applyZoomAnchor = () => {
    const anchor = zoomAnchorRef.current;
    const viewport = viewportRef.current;
    const box = pageBoxRef.current;
    if (!anchor || !viewport || !box) return;
    zoomAnchorRef.current = null;
    viewport.scrollTo({
      left: Math.max(0, box.offsetLeft + anchor.fx * box.offsetWidth - anchor.vx),
      top: Math.max(0, box.offsetTop + anchor.fy * box.offsetHeight - anchor.vy),
      behavior: "instant",
    });
  };

  // Pinch: the page is scaled with CSS while the fingers move (cheap), and
  // re-rendered at the new size when they lift, keeping the pinched point in
  // place. touch-action on the viewport keeps the browser from zooming the
  // whole page instead.
  const [pinchOrigin, setPinchOrigin] = useState(null);
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!touchZoom || !viewport) return undefined;
    const distance = (touches) =>
      Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);

    const onTouchStart = (event) => {
      if (event.touches.length !== 2 || !pageBoxRef.current) return;
      const view = viewport.getBoundingClientRect();
      const box = pageBoxRef.current.getBoundingClientRect();
      const mx = (event.touches[0].clientX + event.touches[1].clientX) / 2;
      const my = (event.touches[0].clientY + event.touches[1].clientY) / 2;
      pinchRef.current = {
        distance: distance(event.touches),
        base: touchScaleRef.current,
        live: 1,
        anchor: { fx: (mx - box.left) / box.width, fy: (my - box.top) / box.height, vx: mx - view.left, vy: my - view.top },
      };
      setPinchOrigin(`${mx - box.left}px ${my - box.top}px`);
    };
    const onTouchMove = (event) => {
      const pinch = pinchRef.current;
      if (!pinch || event.touches.length !== 2) return;
      event.preventDefault();
      pinch.live = clampTouchZoom(pinch.base * (distance(event.touches) / pinch.distance)) / pinch.base;
      setPinchScale(pinch.live);
    };
    const onTouchEnd = (event) => {
      const pinch = pinchRef.current;
      if (!pinch || event.touches.length >= 2) return;
      pinchRef.current = null;
      setPinchScale(1);
      setPinchOrigin(null);
      applyTouchZoom(pinch.base * pinch.live, pinch.anchor);
    };

    viewport.addEventListener("touchstart", onTouchStart, { passive: true });
    viewport.addEventListener("touchmove", onTouchMove, { passive: false });
    viewport.addEventListener("touchend", onTouchEnd);
    viewport.addEventListener("touchcancel", onTouchEnd);
    return () => {
      viewport.removeEventListener("touchstart", onTouchStart);
      viewport.removeEventListener("touchmove", onTouchMove);
      viewport.removeEventListener("touchend", onTouchEnd);
      viewport.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [touchZoom, isMounted, fileUrl, applyTouchZoom]);

  const readAloudLang = readAloud?.lang || "";
  const pdfSpeech = usePdfReadAloud({
    enabled: Boolean(readAloud?.sessionKey),
    sessionKey: readAloud?.sessionKey,
    lang: readAloudLang,
    pdfRef,
    numPages,
    pageNumber,
    setPageNumber,
    renderWidth: renderPageWidth,
  });

  // Keep the sentence being read in view inside the document's own scroller.
  const firstHighlight = pdfSpeech.highlightRects[0];
  useEffect(() => {
    if (firstHighlight && highlightRef.current) revealInScrollParent(highlightRef.current, { topInset: 8 });
  }, [firstHighlight]);

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
      {showDownload && (
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
      )}
    </div>
  );

  const goToPreviousPage = () => changePage(-1);
  const goToNextPage = () => changePage(1);

  const onPageStateChangeRef = useRef(onPageStateChange);
  useEffect(() => {
    onPageStateChangeRef.current = onPageStateChange;
  }, [onPageStateChange]);

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
      className={`flex flex-col w-full min-w-0 max-w-full ${
        !hideToolbar
          ? "rounded-2xl border border-border bg-[#0B101D] shadow-2xl overflow-hidden"
          : ""
      } ${fillHeight ? "h-full min-h-0" : ""} ${className}`}
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

      {pdfSpeech.available && !error && (
        <SpeechControls
          speech={pdfSpeech.speech}
          onListen={pdfSpeech.listen}
          lang={readAloudLang}
          label="document"
          notice={pdfSpeech.notice}
          className="shrink-0"
        />
      )}

      {/* PDF CANVAS VIEWPORT CONTAINER. With touchZoom it sits in a wrapper
          that also holds the zoom control, so the control stays put while
          the page scrolls; a zoomed page is laid out from the left edge, as
          a centred page wider than the viewport could not be scrolled to its
          left side. */}
      <div className={touchZoom ? "relative flex w-full flex-1 min-h-0 flex-col" : "contents"}>
      <div
        ref={viewportRef}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
        onCopy={(e) => e.preventDefault()}
        className={`relative w-full min-h-0 bg-[#060913] p-2 sm:p-3.5 flex ${isZoomedIn ? "justify-start" : "justify-center"} items-start scroll-smooth rounded-2xl border border-border/80 select-none ${touchZoom ? "touch-pan-x touch-pan-y" : ""} ${viewportSizing}`}
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
          /* PDF Document Rendering with Responsive Width */
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
            className={`flex flex-col min-h-full ${isZoomedIn ? "items-start max-w-none" : "items-center max-w-full"}`}
          >
            <div className={`my-auto py-3 sm:py-6 transition-all duration-150 flex ${isZoomedIn ? "justify-start max-w-none" : "justify-center max-w-full"}`}>
              <div
                ref={pageBoxRef}
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
                onCopy={(e) => e.preventDefault()}
                className={`relative select-none ${isZoomedIn ? "max-w-none" : "max-w-full"}`}
                style={pinchScale !== 1 ? { transform: `scale(${pinchScale})`, transformOrigin: pinchOrigin || "top left" } : undefined}
              >
                <Page
                  pageNumber={pageNumber}
                  width={renderPageWidth}
                  onLoadSuccess={(page) => {
                    if (page?.originalWidth && page?.originalHeight) {
                      setPageAspect(page.originalWidth / page.originalHeight);
                    }
                  }}
                  onRenderSuccess={applyZoomAnchor}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  className="shadow-2xl rounded-lg overflow-hidden border border-transparent/60 bg-white"
                />
                {/* Read-aloud highlight: boxes over the sentence being spoken,
                    positioned from pdf.js text coordinates. */}
                {pdfSpeech.highlightRects.length > 0 && (
                  <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                    {pdfSpeech.highlightRects.map((rect, i) => (
                      <span
                        key={i}
                        ref={i === 0 ? highlightRef : undefined}
                        className="tts-pdf-highlight absolute"
                        style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Document>
        )}
      </div>
      {touchZoom && numPages && !error && (
        <div className="absolute right-2 top-2 z-10 flex items-center gap-0.5 rounded-full border border-border bg-card/95 p-0.5 shadow-lg backdrop-blur-sm">
          {/* Inline radius: globals.css gives every <button> an unlayered
              6px radius that beats rounded-full. */}
          <button
            type="button"
            onClick={() => applyTouchZoom(touchScale - TOUCH_ZOOM_STEP, centreAnchor())}
            disabled={touchScale <= 1}
            aria-label="Zoom out"
            style={{ borderRadius: 9999 }}
            className="flex h-9 w-9 items-center justify-center text-foreground transition hover:bg-muted disabled:opacity-30 cursor-pointer"
          >
            <ZoomOut size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => applyTouchZoom(1)}
            disabled={touchScale <= 1}
            aria-label={touchScale <= 1 ? "Fitted to width" : "Fit page to width"}
            style={{ borderRadius: 9999 }}
            className="h-9 min-w-[48px] px-1 text-xs font-bold tabular-nums text-foreground transition hover:bg-muted disabled:cursor-default cursor-pointer"
          >
            {touchScale <= 1 ? "Fit" : `${Math.round(touchScale * 100)}%`}
          </button>
          <button
            type="button"
            onClick={() => applyTouchZoom(touchScale + TOUCH_ZOOM_STEP, centreAnchor())}
            disabled={touchScale >= MAX_ZOOM}
            aria-label="Zoom in"
            style={{ borderRadius: 9999 }}
            className="flex h-9 w-9 items-center justify-center text-foreground transition hover:bg-muted disabled:opacity-30 cursor-pointer"
          >
            <ZoomIn size={16} aria-hidden="true" />
          </button>
        </div>
      )}
      </div>
    </div>
  );
}

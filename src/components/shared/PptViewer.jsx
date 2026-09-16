"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  AlertCircle,
  Loader2,
  Presentation,
} from "lucide-react";

import { getDisplayUrl } from "@/lib/blob";
import { parsePptxArrayBuffer } from "@/lib/pptxParser";

const MIN_ZOOM_MULT = 0.5; // 50% relative to Fit
const MAX_ZOOM_MULT = 2.5; // 250% relative to Fit
const ZOOM_STEP = 0.2;

export default function PptViewer({
  fileUrl,
  title = "Presentation",
  className = "",
  hideToolbar = false,
  onControlsRender,
  /** Hosts that shouldn't hand the source deck to the viewer pass false. */
  showDownload = true,
  /**
   * The learn player's contract, same as PdfViewer and DocxViewer: below xl
   * the slide area takes the height its parent column leaves. Every other
   * host (and the player at xl) gets a slide area sized by the deck itself.
   */
  fillHeight = false,
}) {
  const resolvedUrl = getDisplayUrl(fileUrl);

  const [slides, setSlides] = useState([]);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [loadingStep, setLoadingStep] = useState("Loading presentation..."); // "Loading presentation..." | "Preparing presentation..." | null
  const [error, setError] = useState(null);

  // Responsive measurement & scale calculations
  const [containerSize, setContainerSize] = useState({ width: 960, height: 540 });
  const [zoomScale, setZoomScale] = useState(1.0);
  const [isFit, setIsFit] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [pageInput, setPageInput] = useState("1");

  const viewportRef = useRef(null);
  const slidesRef = useRef(slides);

  useEffect(() => {
    slidesRef.current = slides;
  }, [slides]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update input text when active index changes
  useEffect(() => {
    setPageInput(String(activeSlideIndex + 1));
  }, [activeSlideIndex]);

  // Dynamic ResizeObserver to fit slide completely inside container without clipping
  useEffect(() => {
    if (!viewportRef.current) return;

    const updateContainerDimensions = () => {
      if (viewportRef.current) {
        const el = viewportRef.current;
        const cs = window.getComputedStyle(el);
        // Measure the real content box. clientWidth/Height include padding, and
        // this used to subtract a hardcoded 24px for it — wrong whenever the
        // padding is not 12px a side, and on mobile it is 0. Over-subtracting
        // from an aspect-video box also skews it wider than 16:9, which made
        // *height* the binding constraint and left the slide narrower than the
        // space it had.
        const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
        const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
        const w = (el.clientWidth || 960) - padX;
        const h = (el.clientHeight || 540) - padY;
        // Floor at 1, not at a fixed minimum: an unconditional floor inverted
        // the whole point of fitting, scaling the slide *up* past a narrow
        // container so it overflowed and lost its first and last columns.
        setContainerSize({
          width: Math.max(w, 1),
          height: Math.max(h, 1),
        });
      }
    };

    updateContainerDimensions();
    const observer = new ResizeObserver(updateContainerDimensions);
    observer.observe(viewportRef.current);

    return () => observer.disconnect();
  }, [isMounted]);

  // Fetch & Parse PPTX ArrayBuffer
  useEffect(() => {
    if (!fileUrl) return;

    let isMounted = true;
    setLoadingStep("Loading presentation...");
    setError(null);
    setSlides([]);
    setActiveSlideIndex(0);

    async function loadPresentation() {
      try {
        const fetchUrl = resolvedUrl || fileUrl;
        const response = await axios.get(fetchUrl, {
          responseType: "arraybuffer",
          withCredentials: true,
        });

        if (!isMounted) return;
        setLoadingStep("Preparing presentation...");

        const parsed = await parsePptxArrayBuffer(response.data);

        if (!isMounted) return;

        if (parsed && parsed.slides && parsed.slides.length > 0) {
          setSlides(parsed.slides);
          slidesRef.current = parsed.slides;
          setLoadingStep(null);
        } else {
          throw new Error("No slides could be extracted from presentation.");
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("[PPT VIEWER] Parsing error:", err);
        setLoadingStep(null);
        setError(
          err?.response?.status === 401 || err?.response?.status === 403
            ? "Unauthorized access to presentation file."
            : err?.message || "Unable to render presentation slides."
        );
      }
    }

    loadPresentation();

    return () => {
      isMounted = false;
    };
  }, [fileUrl, resolvedUrl]);

  // Reliable slide navigation using dynamic slidesRef
  const changeSlide = useCallback((delta) => {
    setActiveSlideIndex((prev) => {
      const total = slidesRef.current.length;
      if (total <= 0) return 0;
      const next = Math.min(Math.max(0, prev + delta), total - 1);
      if (viewportRef.current) viewportRef.current.scrollTop = 0;
      return next;
    });
  }, []);

  // Click-to-turn on the slide canvas: a click on the right half of the
  // viewport advances a slide, the left half goes back — the same gesture the
  // PDF viewer offers (see PdfViewer's handleViewportClick). The handler sits
  // on the scrollable viewport itself rather than on absolutely-positioned
  // overlay halves, because an overlay spanning the viewport swallows every
  // wheel and touch-scroll gesture before it reaches the scroll area beneath.
  // A plain click handler doesn't: the browser only fires "click" for a genuine
  // tap with no drag in between.
  const handleViewportClick = (e) => {
    if (loadingStep || error || slidesRef.current.length <= 1) return;
    // A click that finishes a text selection shouldn't also turn the slide.
    if (typeof window !== "undefined" && window.getSelection()?.toString()) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickedRightHalf = e.clientX - rect.left > rect.width / 2;
    changeSlide(clickedRightHalf ? 1 : -1);
  };

  const handlePageInputSubmit = (e) => {
    if (e.key === "Enter") {
      const parsed = parseInt(pageInput, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= slides.length) {
        setActiveSlideIndex(parsed - 1);
      } else {
        setPageInput(String(activeSlideIndex + 1));
      }
    }
  };

  // Keyboard Arrow Navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea" || activeTag === "select") return;

      if (e.key === "ArrowLeft") {
        changeSlide(-1);
      } else if (e.key === "ArrowRight") {
        changeSlide(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [changeSlide]);

  // Zoom controls
  const handleZoomIn = () => {
    setIsFit(false);
    setZoomScale((prev) => Math.min(prev + ZOOM_STEP, MAX_ZOOM_MULT));
  };

  const handleZoomOut = () => {
    setIsFit(false);
    setZoomScale((prev) => Math.max(prev - ZOOM_STEP, MIN_ZOOM_MULT));
  };

  const handleFit = () => {
    setIsFit(true);
    setZoomScale(1.0);
  };

  const totalSlides = slides.length;
  const currentSlide = slides[activeSlideIndex] || null;

  // Calculate proportional slide scaling to ensure complete slide fits without clipping
  const baseSlideWidth = currentSlide?.width || 960;
  const baseSlideHeight = currentSlide?.height || 540;

  // Scale = min(availableWidth / baseWidth, availableHeight / baseHeight)
  const fitScale = Math.min(
    containerSize.width / baseSlideWidth,
    containerSize.height / baseSlideHeight
  );

  const effectiveScale = isFit ? fitScale : fitScale * zoomScale;
  // Floored, not rounded: the viewport carries the slide's own aspect ratio
  // (see its style below), so a fitted slide is as big as its box — rounding a
  // sub-pixel remainder up would overflow it by 1px and raise a scrollbar over
  // a slide that actually fits.
  const renderedWidth = Math.floor(baseSlideWidth * effectiveScale);
  const renderedHeight = Math.floor(baseSlideHeight * effectiveScale);

  // Reusable Controls Bar JSX node (used in standalone header or passed to parent header)
  const controlsNode = (
    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
      {/* Slide Navigation */}
      {totalSlides > 0 && (
        <div className="flex items-center gap-1 rounded-xl bg-background border border-border px-2 py-1">
          <button
            type="button"
            onClick={() => changeSlide(-1)}
            disabled={activeSlideIndex <= 0}
            className="rounded-lg p-1 text-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition cursor-pointer"
            title="Previous Slide (Left Arrow)"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="flex items-center gap-1 text-sm font-semibold text-foreground font-mono">
            <input
              type="text"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onKeyDown={handlePageInputSubmit}
              className="w-7 rounded bg-background border border-transparent px-1 py-0.5 text-center text-sm font-bold text-foreground focus:outline-none focus:border-primary font-mono"
              title="Type slide number and press Enter"
            />
            <span className="text-muted-foreground">/</span>
            <span className="text-foreground">{totalSlides}</span>
          </div>

          <button
            type="button"
            onClick={() => changeSlide(1)}
            disabled={activeSlideIndex >= totalSlides - 1}
            className="rounded-lg p-1 text-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition cursor-pointer"
            title="Next Slide (Right Arrow)"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Zoom Controls */}
      <div className="flex items-center gap-1 rounded-xl bg-background border border-border px-2 py-1">
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={!isFit && zoomScale <= MIN_ZOOM_MULT}
          className="rounded-lg p-1 text-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut size={15} />
        </button>

        <span className="text-[13px] font-semibold text-foreground min-w-[36px] text-center font-mono">
          {isFit ? "Fit" : `${Math.round(zoomScale * 100)}%`}
        </span>

        <button
          type="button"
          onClick={handleZoomIn}
          disabled={!isFit && zoomScale >= MAX_ZOOM_MULT}
          className="rounded-lg p-1 text-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn size={15} />
        </button>

        {!isFit && (
          <button
            type="button"
            onClick={handleFit}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[13px] font-bold text-primary hover:bg-primary/10 border border-primary/30 transition cursor-pointer"
            title="Reset to Fit View"
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
          title="Download Presentation"
        >
          <Download size={14} />
          <span className="hidden sm:inline">Download</span>
        </a>
      )}
    </div>
  );

  const onControlsRenderRef = useRef(onControlsRender);
  useEffect(() => {
    onControlsRenderRef.current = onControlsRender;
  }, [onControlsRender]);

  useEffect(() => {
    if (onControlsRenderRef.current) {
      onControlsRenderRef.current(controlsNode);
    }
  }, [activeSlideIndex, totalSlides, isFit, zoomScale, pageInput, resolvedUrl, fileUrl, showDownload]);

  if (!isMounted) {
    return (
      <div className="flex h-96 w-full items-center justify-center rounded-2xl border border-border bg-[#0B101D]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col w-full ${
        !hideToolbar
          ? "rounded-2xl border border-border bg-[#0B101D] shadow-2xl overflow-hidden"
          : ""
      } ${fillHeight ? "max-xl:h-full max-xl:flex-1 max-xl:min-h-0" : ""} ${className}`}
    >
      {/* Standalone Header Toolbar */}
      {!hideToolbar && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border/80 bg-[#0D1222] px-3.5 py-2.5 text-foreground rounded-t-2xl shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 border border-primary/30 text-primary shrink-0">
              <Presentation size={15} />
            </div>
            <span className="text-sm font-bold text-foreground truncate max-w-[160px] sm:max-w-xs md:max-w-md">
              {title || "Presentation"}
            </span>
          </div>

          {controlsNode}
        </div>
      )}

      {/* SLIDE CANVAS VIEWPORT CONTAINER */}
      {/* The slide scale is measured from this box, so it must never depend on
          a parent having a definite height: the deck's aspect ratio sizes it
          from its width (capped by max-h). Only the learn player, below xl,
          stretches it to fill instead — the one host whose column is sized. */}
      <div
        ref={viewportRef}
        onClick={handleViewportClick}
        style={{ aspectRatio: `${baseSlideWidth} / ${baseSlideHeight}` }}
        className={`relative w-full overflow-auto bg-[#060913] p-2 sm:p-4 flex justify-center items-start scroll-smooth rounded-2xl border border-border/80 ${
          fillHeight ? "max-xl:flex-1 max-xl:min-h-0 xl:max-h-[88vh]" : "max-h-[88vh]"
        } ${totalSlides > 1 ? "cursor-pointer" : ""}`}
      >
        {/* Loading Overlay */}
        {loadingStep && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#060913]/90 z-20 rounded-2xl">
            <Loader2 className="h-9 w-9 animate-spin text-primary" />
            <p className="text-sm font-bold text-foreground">{loadingStep}</p>
          </div>
        )}

        {/* Error / Fallback State */}
        {error ? (
          <div className="my-12 flex flex-col items-center justify-center gap-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-8 text-center max-w-md">
            <AlertCircle className="h-10 w-10 text-amber-400" />
            <div>
              <h4 className="text-base font-bold text-foreground mb-1">Presentation preview unavailable</h4>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                We couldn't render this presentation in the browser. You can download the file to view it in Microsoft PowerPoint.
              </p>
            </div>
            <a
              href={resolvedUrl || fileUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-orange-600 px-5 py-2.5 text-sm font-bold text-slate-950 transition shadow-lg"
            >
              <Download size={15} />
              <span>Download Presentation</span>
            </a>
          </div>
        ) : currentSlide ? (
          /* Render Complete Active Slide Canvas dynamically sized to fit 100% of the viewport */
          <div
            /* No themed surface here: bg-card follows the reader's light/dark
               theme, while a slide's background is a property of the deck. A
               light-theme card under a deck's own dark-on-white type was what
               made the text vanish. */
            className="relative transition-all duration-150 shadow-2xl rounded-xl overflow-hidden border border-transparent/60 shrink-0 mt-0 mb-auto mx-auto"
            style={{
              width: `${renderedWidth}px`,
              height: `${renderedHeight}px`,
              aspectRatio: `${baseSlideWidth} / ${baseSlideHeight}`,
              backgroundColor: currentSlide.background || "#FFFFFF",
            }}
          >
            {/* The slide is laid out once at its own canvas size and shrunk
                (or grown) as a whole. Scaling each font size separately — with
                a minimum so text stayed legible — let text outgrow its boxes
                on a phone while positions and padding kept shrinking, so it
                spilled into neighbouring shapes and was cut off at the edge.
                One transform keeps every proportion the deck was authored
                with; the zoom controls are there for reading small text. */}
            <div
              className="absolute left-0 top-0"
              style={{
                width: `${baseSlideWidth}px`,
                height: `${baseSlideHeight}px`,
                transform: `scale(${renderedWidth / baseSlideWidth})`,
                transformOrigin: "0 0",
              }}
            >
            {/* Slide Elements */}
            {currentSlide.elements?.map((elem) => {
              if (elem.type === "image") {
                return (
                  <img
                    key={elem.id}
                    src={elem.src}
                    alt="Slide media"
                    className="absolute object-contain"
                    style={{
                      left: `${elem.left}%`,
                      top: `${elem.top}%`,
                      width: `${elem.width}%`,
                      height: `${elem.height}%`,
                    }}
                  />
                );
              }

              if (elem.type === "text") {
                return (
                  <div
                    key={elem.id}
                    className="absolute overflow-visible p-1 flex flex-col justify-start"
                    style={{
                      left: `${elem.left}%`,
                      top: `${elem.top}%`,
                      width: `${elem.width}%`,
                      height: `${elem.height}%`,
                      backgroundColor: elem.bgColor || "transparent",
                    }}
                  >
                    {elem.paragraphs?.map((p, pIdx) => (
                      <p
                        key={pIdx}
                        className="leading-tight mb-1"
                        style={{ textAlign: p.textAlign || "left" }}
                      >
                        {p.runs?.map((run, rIdx) => (
                          <span
                            key={rIdx}
                            style={{
                              fontSize: `${run.fontSize}px`,
                              fontWeight: run.bold ? "bold" : "normal",
                              fontStyle: run.italic ? "italic" : "normal",
                              color: run.color || currentSlide.defaultTextColor || "#000000",
                            }}
                          >
                            {run.text}
                          </span>
                        ))}
                      </p>
                    ))}
                  </div>
                );
              }

              if (elem.type === "table") {
                return (
                  <div
                    key={elem.id}
                    /* No backdrop, no padding and no theme text colour of its
                       own: every cell carries the fill and type colour the deck
                       authored, and a panel painted underneath them only shows
                       through the gridlines as a colour the slide never had. */
                    className="absolute overflow-visible"
                    style={{
                      left: `${elem.left}%`,
                      top: `${elem.top}%`,
                      width: `${elem.width}%`,
                      height: `${elem.height}%`,
                    }}
                  >
                    <table
                      /* Fixed layout + the authored column widths: left to
                         itself the browser sizes columns by their text, which
                         is not the table the slide was designed with. */
                      style={{
                        width: "100%",
                        height: "100%",
                        borderCollapse: "collapse",
                        tableLayout: "fixed",
                      }}
                    >
                      {elem.columnWidths?.length > 0 && (
                        <colgroup>
                          {elem.columnWidths.map((width, cIdx) => (
                            <col key={cIdx} style={{ width: `${width}%` }} />
                          ))}
                        </colgroup>
                      )}
                      <tbody>
                        {elem.rows?.map((row, rIdx) => (
                          <tr key={rIdx}>
                            {row?.map((cell, cIdx) => {
                              const c = typeof cell === "string" ? { text: cell } : cell || {};
                              return (
                                <td
                                  key={cIdx}
                                  colSpan={c.colSpan}
                                  rowSpan={c.rowSpan}
                                  style={{
                                    backgroundColor: c.bgColor || undefined,
                                    color: c.color || currentSlide.defaultTextColor || "#000000",
                                    fontWeight: c.bold ? 700 : 400,
                                    fontStyle: c.italic ? "italic" : "normal",
                                    // Canvas units, like a text run's size — the
                                    // slide's transform scales both together.
                                    fontSize: `${c.fontSize || 14}px`,
                                    textAlign: c.textAlign || "left",
                                    padding: "3px 5px",
                                    border: "1px solid rgba(255, 255, 255, 0.25)",
                                    verticalAlign: "middle",
                                    overflow: "hidden",
                                  }}
                                >
                                  {c.text}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              }

              return null;
            })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import {
  FileText,
  Download,
  AlertCircle,
  Loader2,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";

import { getDisplayUrl } from "@/lib/blob";
import { parseDocxArrayBuffer } from "@/lib/docxParser";
import { buildDocxSpeech } from "@/lib/documentSpeech";
import SpeechControls from "@/components/student/tts/SpeechControls";
import useChunkHighlight from "@/hooks/useChunkHighlight";
import useTextToSpeech from "@/hooks/useTextToSpeech";

export default function DocxViewer({
  fileUrl,
  title = "Document",
  className = "",
  hideToolbar = false,
  // Opt-in, mirroring PdfViewer: fill the height the parent allots and let
  // THIS viewport be the scroll container. Without it the unconditional
  // min-h-[520px] reading-pane floor overflows a phone-sized player frame,
  // producing a second scroller nested inside the page's. Consumers that do
  // not pass it keep the original sizing exactly.
  fillHeight = false,
  onControlsRender,
  // Same opt-out PptViewer takes: drops the Download button from the controls
  // for hosts that don't want the file offered for download.
  showDownload = true,
  // Opt-in read aloud for the student player: { sessionKey, lang }. Omitted
  // by every other consumer (instructor views), which render as before.
  readAloud = null,
}) {
  const resolvedUrl = getDisplayUrl(fileUrl);

  // Whether a Download button is already on screen for this document: in this
  // viewer's own toolbar, or in the host's header when the host takes the
  // controls via onControlsRender. Drives the fallback card below, so the
  // student is never shown two buttons that do the same thing — and so that
  // with showDownload off, the card's own button comes back as the only way
  // to reach a document the browser can't render.
  const hasDownloadAffordance = showDownload && (!hideToolbar || Boolean(onControlsRender));

  const [elements, setElements] = useState([]);
  const [loadingStep, setLoadingStep] = useState("Loading document..."); // "Loading document..." | "Preparing view..." | null
  const [error, setError] = useState(null);
  const [zoomScale, setZoomScale] = useState(1.0);
  const [isMounted, setIsMounted] = useState(false);

  const viewportRef = useRef(null);
  const paperRef = useRef(null);

  // Read aloud — sentences come straight from the parsed paragraphs/tables,
  // and each rendered sentence carries its chunk number for highlighting.
  const readAloudLang = readAloud?.lang || "";
  const readAloudEnabled = Boolean(readAloud?.sessionKey);
  const speech = useTextToSpeech(readAloudEnabled ? `docx:${readAloud.sessionKey}` : null);
  const docSpeech = useMemo(
    () => (readAloudEnabled && elements.length > 0 ? buildDocxSpeech(elements, readAloudLang) : null),
    [readAloudEnabled, elements, readAloudLang]
  );
  const showReadAloud = readAloudEnabled && speech.supported && (docSpeech?.chunks.length ?? 0) > 0;
  useChunkHighlight(paperRef, showReadAloud && (speech.isPlaying || speech.isPaused) ? speech.index : -1, docSpeech, {
    topInset: 16,
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!fileUrl) return;

    let isMountedFlag = true;
    setLoadingStep("Loading document...");
    setError(null);
    setElements([]);

    async function loadDocument() {
      try {
        const fetchUrl = resolvedUrl || fileUrl;
        const response = await axios.get(fetchUrl, {
          responseType: "arraybuffer",
          withCredentials: true,
        });

        if (!isMountedFlag) return;
        setLoadingStep("Preparing view...");

        const parsed = await parseDocxArrayBuffer(response.data);

        if (!isMountedFlag) return;

        if (parsed && parsed.elements && parsed.elements.length > 0) {
          setElements(parsed.elements);
          setLoadingStep(null);
        } else {
          throw new Error("No readable text or elements extracted from document.");
        }
      } catch (err) {
        if (!isMountedFlag) return;
        console.error("[DOCX VIEWER] Parsing error:", err);
        setLoadingStep(null);
        setError(
          err?.response?.status === 401 || err?.response?.status === 403
            ? "Unauthorized access to document file."
            : err?.message || "Unable to render document content."
        );
      }
    }

    loadDocument();

    return () => {
      isMountedFlag = false;
    };
  }, [fileUrl, resolvedUrl]);

  // Click-to-page on the document paper: a click on the right half of the
  // viewport moves forward, the left half back — the same gesture PdfViewer's
  // handleViewportClick gives a PDF. A .docx carries no page breaks of its own
  // (the parser yields one continuous flow of paragraphs), so a "page" here is
  // one viewport height, minus a small overlap so no line is stepped over. The
  // handler sits on the scrollable viewport itself rather than on overlay
  // halves, which would swallow every wheel and touch-scroll gesture before it
  // reached the scroll area; the browser only fires "click" for a genuine tap
  // with no drag in between.
  const handleViewportClick = (e) => {
    if (loadingStep || error || elements.length === 0) return;
    // A click that finishes a text selection shouldn't also turn the page.
    if (typeof window !== "undefined" && window.getSelection()?.toString()) return;
    const el = viewportRef.current;
    if (!el) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const forward = e.clientX - rect.left > rect.width / 2;
    const step = Math.max(el.clientHeight - 80, 120);
    el.scrollTop += forward ? step : -step;
  };

  const handleZoomIn = () => setZoomScale((prev) => Math.min(prev + 0.15, 2.0));
  const handleZoomOut = () => setZoomScale((prev) => Math.max(prev - 0.15, 0.7));
  const handleResetZoom = () => setZoomScale(1.0);

  // Controls bar node
  const controlsNode = (
    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
      {/* Zoom Controls */}
      <div className="flex items-center gap-1 rounded-xl bg-background border border-border px-2 py-1">
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={zoomScale <= 0.7}
          className="rounded-lg p-1 text-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut size={15} />
        </button>

        <span className="text-[13px] font-semibold text-foreground min-w-[36px] text-center font-mono">
          {Math.round(zoomScale * 100)}%
        </span>

        <button
          type="button"
          onClick={handleZoomIn}
          disabled={zoomScale >= 2.0}
          className="rounded-lg p-1 text-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn size={15} />
        </button>

        {zoomScale !== 1.0 && (
          <button
            type="button"
            onClick={handleResetZoom}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[13px] font-bold text-primary hover:bg-primary/10 border border-primary/30 transition cursor-pointer"
            title="Reset Zoom"
          >
            <Maximize2 size={12} />
            <span className="hidden sm:inline">Reset</span>
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
          title="Download Word Document"
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
    // showDownload included so a host toggling it re-publishes the controls
    // rather than leaving the previously-rendered node (with its Download)
    // in the header.
  }, [zoomScale, resolvedUrl, fileUrl, showDownload]);

  if (!isMounted) {
    return (
      <div className="flex h-96 w-full items-center justify-center rounded-2xl border border-border bg-[#0B101D]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // fillHeight: below xl take the remaining height of the parent column and
  // scroll here; at xl the original reading pane, unchanged. Otherwise the
  // original sizing at every width. Branches never overlap, so nothing
  // depends on stylesheet order.
  const docViewportSizing = fillHeight
    ? "flex-1 min-h-0 xl:flex-none xl:h-[78vh] xl:min-h-[520px] xl:max-h-[900px]"
    : "h-[78vh] min-h-[520px] max-h-[900px]";

  return (
    <div
      className={`flex flex-col w-full ${
        !hideToolbar
          ? "rounded-2xl border border-border bg-[#0B101D] shadow-2xl overflow-hidden"
          : ""
      } ${fillHeight ? "max-xl:h-full max-xl:min-h-0" : ""} ${className}`}
    >
      {/* Header Toolbar */}
      {!hideToolbar && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border/80 bg-[#0D1222] px-3.5 py-2.5 text-foreground rounded-t-2xl">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 shrink-0">
              <FileText size={15} />
            </div>
            <span className="text-sm font-bold text-foreground truncate max-w-[160px] sm:max-w-xs md:max-w-md">
              {title || "Word Document"}
            </span>
          </div>

          {controlsNode}
        </div>
      )}

      {showReadAloud && (
        <SpeechControls
          speech={speech}
          onListen={() => speech.start(docSpeech.chunks, { lang: readAloudLang })}
          lang={readAloudLang}
          label="document"
          className="shrink-0"
        />
      )}

      {/* DOCUMENT PAPER VIEWPORT */}
      <div
        ref={viewportRef}
        onClick={handleViewportClick}
        className={`relative w-full overflow-auto bg-[#060913] p-4 sm:p-8 flex justify-center items-start scroll-smooth rounded-2xl border border-border/80 ${docViewportSizing}`}
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
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertCircle size={24} />
            </div>
            <div>
              <h4 className="text-base font-bold text-foreground mb-1">Document preview unavailable</h4>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                This Word document cannot be rendered directly in the browser preview.
                {hasDownloadAffordance
                  ? " Use Download at the top of this document to view it on your device."
                  : " You can download the file to view it on your device."}
              </p>
            </div>
            {/* Only when nothing else on screen offers the download. With the
                toolbar visible — or its controls hoisted into a host header —
                this repeated the Download button sitting a few pixels above
                it. */}
            {!hasDownloadAffordance && (
              <a
                href={resolvedUrl || fileUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-orange-600 px-5 py-2.5 text-sm font-bold text-slate-950 transition shadow-lg"
              >
                <Download size={15} />
                <span>Download Document</span>
              </a>
            )}
          </div>
        ) : elements.length > 0 ? (
          /* Render Document Paper Container */
          <div
            ref={paperRef}
            className="w-full max-w-4xl bg-background border border-border text-foreground p-6 sm:p-12 shadow-2xl rounded-2xl transition-transform duration-150 origin-top"
            style={{
              transform: `scale(${zoomScale})`,
            }}
          >
            {elements.map((elem, idx) => {
              if (elem.type === "image") {
                return (
                  <div key={idx} className="my-6 flex justify-center">
                    <img
                      src={elem.src}
                      alt="Document graphic"
                      className="max-w-full max-h-[500px] object-contain rounded-lg border border-border shadow-md"
                    />
                  </div>
                );
              }

              if (elem.type === "paragraph") {
                let textClass = "text-base text-foreground leading-relaxed mb-3";
                if (elem.style === "h1") {
                  textClass = "text-3xl font-bold text-foreground mb-4 mt-6 border-b border-border pb-2";
                } else if (elem.style === "h2") {
                  textClass = "text-2xl font-bold text-foreground mb-3 mt-5";
                } else if (elem.style === "h3") {
                  textClass = "text-xl font-semibold text-foreground mb-2 mt-4";
                }

                return (
                  <p
                    key={idx}
                    className={textClass}
                    style={{ textAlign: elem.alignment || "left" }}
                  >
                    {showReadAloud && docSpeech.paragraphs[idx]
                      ? docSpeech.paragraphs[idx].map((segment, sIdx) => {
                          const run = elem.runs?.[segment.runIndex] || {};
                          return (
                            <span
                              key={sIdx}
                              className={segment.chunkIndex != null ? "tts-chunk" : undefined}
                              data-tts-chunk={segment.chunkIndex ?? undefined}
                              style={{
                                fontWeight: run.bold ? "bold" : "normal",
                                fontStyle: run.italic ? "italic" : "normal",
                                textDecoration: run.underline ? "underline" : "none",
                                color: run.color || undefined,
                              }}
                            >
                              {segment.text}
                            </span>
                          );
                        })
                      : elem.runs?.map((run, rIdx) => (
                      <span
                        key={rIdx}
                        style={{
                          fontWeight: run.bold ? "bold" : "normal",
                          fontStyle: run.italic ? "italic" : "normal",
                          textDecoration: run.underline ? "underline" : "none",
                          color: run.color || undefined,
                        }}
                      >
                        {run.text}
                      </span>
                    ))}
                  </p>
                );
              }

              if (elem.type === "table") {
                return (
                  <div key={idx} className="my-6 overflow-x-auto rounded-xl border border-border bg-background/60 p-2">
                    <table className="w-full text-sm text-foreground border-collapse">
                      <tbody>
                        {elem.rows?.map((row, rIdx) => (
                          <tr
                            key={rIdx}
                            className={`border-b border-border/80${showReadAloud && docSpeech.rows[`${idx}:${rIdx}`] != null ? " tts-chunk" : ""}`}
                            data-tts-chunk={showReadAloud ? docSpeech.rows[`${idx}:${rIdx}`] : undefined}
                          >
                            {row?.map((cell, cIdx) => (
                              <td key={cIdx} className="p-2 border-r border-border/80">
                                {cell}
                              </td>
                            ))}
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
        ) : null}
      </div>
    </div>
  );
}

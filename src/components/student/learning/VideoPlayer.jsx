"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import {
    FileText,
    ExternalLink,
    PlayCircle,
    BookOpen,
    Presentation,
    ChevronLeft,
    ChevronRight,
    Music,
} from "lucide-react";
import DOMPurify from "isomorphic-dompurify";

import { resolveVideoSource } from "@/lib/videoSource";
import VideoSurface from "@/components/shared/video/VideoSurface";
import OrangeVideoPlayer from "@/components/student/learning/video/OrangeVideoPlayer";
import usePlaybackLease from "@/hooks/queries/student/usePlaybackLease";
import useMediaQuery from "@/hooks/useMediaQuery";
import { Button } from "@/components/ui/shadcn/button";
import { getDisplayUrl } from "@/lib/blob";
import MarkdownRenderer from "@/components/ui/MarkdownEditor/MarkdownRenderer";
import { unescapeFromContentApi, highlightCode } from "@/lib/markdown";
import { PdfViewer, PptViewer, DocxViewer, ExternalDocumentViewer } from "@/components/shared/LazyDocumentViewers";
import PagedContent from "@/components/shared/PagedContent";
import SpeechControls from "@/components/student/tts/SpeechControls";
import useLessonReadAloud from "@/hooks/useLessonReadAloud";
import { resolveSpeechLang } from "@/lib/textToSpeech";
import { SlideColumnsView } from "@/components/instructor/LessonComposer/cells/slideCanvas/SlideColumnsLayout";
import { parseSlideDeckJson } from "@/components/instructor/LessonComposer/cells/slideCanvas/slideElementTypes";

const isPdfUrl = (url) => {
    const u = url?.toLowerCase() || "";
    return u.includes(".pdf") || u.includes("/pdf");
};
// PDF is tested first so this stays true to the viewer chain below, where the
// PDF branch already claimed such a URL before the deck branch was reached.
const isPptUrl = (url) => {
    const u = url?.toLowerCase() || "";
    return !isPdfUrl(u) && u.includes(".ppt");
};

const isGoogleSlidesUrl = (url) => Boolean(url?.includes("docs.google.com/presentation"));
const getGoogleSlidesEmbedUrl = (url) => {
    if (!url) return "";
    return url.replace(/\/edit(\?.*)?$/, "/embed").replace(/\/pub(\?.*)?$/, "/embed");
};
const parseSlides = (html) => {
    if (!html) return [];
    const sections = html.split(/<hr\s*\/?>|<!--\s*slide\s*-->/i);
    return sections.map(s => s.trim()).filter(Boolean);
};

/**
 * What a protected video shows until its playback lease is held: a short
 * "preparing" state, or why it cannot play (already playing on another
 * device, no access, …) with an explicit "Try again". Never retries by
 * itself — a conflict stays a conflict until the other device stops.
 * "paused" is the learn page holding no lease on purpose (the onboarding
 * tour is running): the video waits, with nothing to retry.
 */
function PlaybackGate({ lease }) {
    const waiting = lease.status === "idle" || lease.status === "acquiring";
    const conflict = lease.status === "conflict";

    if (lease.status === "paused") {
        return (
            <div role="status" className="flex h-80 w-full flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-[#0B101D] p-6 text-center">
                <PlayCircle className="h-10 w-10 text-muted-foreground" />
                <h4 className="text-base font-bold text-foreground">Video paused during the tour</h4>
                <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">It plays as usual once the tour ends.</p>
            </div>
        );
    }

    return (
        <div
            role={waiting ? "status" : "alert"}
            className="flex h-80 w-full flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-[#0B101D] p-6 text-center"
        >
            <PlayCircle className={`h-10 w-10 text-amber-500 ${waiting ? "animate-pulse" : ""}`} />
            <h4 className="text-base font-bold text-foreground">
                {waiting ? "Preparing video…" : conflict ? "Playing on another device" : "This video can't start"}
            </h4>
            {!waiting && (
                <>
                    <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">{lease.message}</p>
                    <Button type="button" size="sm" variant="outline" onClick={lease.retry}>
                        Try again
                    </Button>
                </>
            )}
        </div>
    );
}

const VideoPlayer = forwardRef(function VideoPlayer(
    { content, lease: externalLease = null, onTimeUpdate, onEnded, onDurationChange, initialTime = 0, speechLanguage, lessonTitle, reserveHeaderCorner = false },
    ref
) {
    // The video itself is drawn by OrangeVideoPlayer (YouTube) or the shared
    // VideoSurface (everything else); this ref is only how the learn page's
    // seek-to-timestamp reaches whichever is on screen.
    const surfaceRef = useRef(null);
    const [slideIndex, setSlideIndex] = useState(0);
    // A file viewer's own toolbar carries the same title this player already
    // shows above it, so the deck rendered its name twice. The viewers can
    // hand their controls up instead (onControlsRender) and drop their header
    // (hideToolbar) — one title, one row of controls.
    const [viewerControls, setViewerControls] = useState(null);

    // Page state reported by PdfViewer, DocxViewer or PagedContent: { page,
    // total, goToPreviousPage, goToNextPage }. The viewer still owns pageNumber and the handlers —
    // this only holds what the header needs to draw, and forwards the same
    // object to the learn page, which draws the buttons below the player.
    // Cleared on every content change so a previous document can never
    // leave controls behind on new content.
    const [pdfPage, setPdfPage] = useState(null);
    const reportPdfPage = (state) => setPdfPage(state);

    // Below xl a fitted PDF page is too small to read, so it gets pinch/zoom
    // (PdfViewer touchZoom); the desktop reading pane is unchanged.
    const isBelowXl = useMediaQuery("(max-width: 1279.98px)");

    const type = content?.type;
    const fileUrl = content?.fileUrl;
    const htmlContent = content?.htmlContent;
    const externalUrl = content?.externalUrl;

    // A student is never sent a video's source with the course content
    // (`mediaProtected`): it comes from the playback lease, claimed when the
    // item opens. Only one device per account holds that lease; the server
    // decides, and a second device gets a clear conflict instead of a video.
    const protectedVideo = type === "VIDEO" && (content?.mediaProtected === true || Boolean(externalLease?.media));
    const localLease = usePlaybackLease(content?.id, { enabled: !externalLease && protectedVideo });
    const lease = externalLease || localLease;

    const videoSource = protectedVideo
        ? resolveVideoSource(lease.media?.url || "")
        : resolveVideoSource(content);
    const displayFileUrl = getDisplayUrl(fileUrl);

    // Lease lost mid-playback: stop the picture now, then explain.
    useEffect(() => {
        if (lease.status === "lost") surfaceRef.current?.pause?.();
    }, [lease.status]);

    // A lease re-claimed in the background (usePlaybackLease) comes with a new
    // signed URL for the same video; the player reloads it, so pick up where
    // the picture was rather than at the step's resume point.
    const lastTimeRef = useRef(0);
    const mediaUrl = protectedVideo ? lease.media?.url || null : null;
    const shownMediaRef = useRef({ contentId: content?.id, url: mediaUrl });
    const [renewedFrom, setRenewedFrom] = useState(null);
    useEffect(() => {
        const shown = shownMediaRef.current;
        shownMediaRef.current = { contentId: content?.id, url: mediaUrl };
        if (shown.contentId !== content?.id) {
            lastTimeRef.current = 0;
            setRenewedFrom(null);
        } else if (shown.url && mediaUrl && shown.url !== mediaUrl) {
            setRenewedFrom({ url: mediaUrl, time: lastTimeRef.current });
        }
    }, [content?.id, mediaUrl]);
    const videoInitialTime = renewedFrom && renewedFrom.url === mediaUrl ? renewedFrom.time : initialTime;
    const handleTimeUpdate = useCallback(
        (seconds) => {
            lastTimeRef.current = seconds;
            onTimeUpdate?.(seconds);
        },
        [onTimeUpdate]
    );

    // A layout effect, so it runs before the new content's viewer reports its
    // first page state (children's passive effects) rather than wiping it.
    useLayoutEffect(() => {
        setPdfPage(null);
    }, [content?.id]);

    useImperativeHandle(
        ref,
        () => ({
            seekTo(seconds) {
                surfaceRef.current?.seekTo?.(seconds);
            },
        }),
        []
    );

    useEffect(() => {
        setSlideIndex(0);
        setViewerControls(null);
    }, [content]);

    // Read aloud (browser speech synthesis) — only for a written text/HTML
    // block, the one content type whose words are the lesson itself. Video,
    // documents, slides, images and assignments keep their own UI. Same
    // image test as isImage below, which can't be used here because hooks
    // must run before the empty-content early return.
    const isTextBlock =
        (type === "TEXT" || type === "HTML") &&
        !(htmlContent?.includes("cc-image-block") || /<img\s+/i.test(htmlContent || ""));
    const readAloud = useLessonReadAloud({
        enabled: isTextBlock && Boolean(htmlContent),
        contentId: content?.id,
        title: content?.title || lessonTitle,
        source: htmlContent ? unescapeFromContentApi(htmlContent) : "",
        lang: resolveSpeechLang(speechLanguage),
    });
    const showReadAloud = isTextBlock && readAloud.hasText && readAloud.speech.supported;
    // PDF/Word viewers read their own extracted text; they only need to know
    // what they're showing and in which language.
    const documentReadAloud = content?.id ? { sessionKey: content.id, lang: resolveSpeechLang(speechLanguage) } : null;

    // Images: computed and loaded before the empty-content return below, so
    // every render calls the same hooks in the same order.
    const isImage =
        type === "IMAGE" ||
        type === "image" ||
        (type === "HTML" && (
            htmlContent?.includes("cc-image-block") ||
            /<figure[^>]*class="[^"]*cc-image-block[^"]*"/i.test(htmlContent || "") ||
            /<img\s+/i.test(htmlContent || "")
        ));

    const parseImageDetails = () => {
        if (!htmlContent) return { src: "", alt: "", caption: "" };
        if (typeof window !== "undefined") {
            try {
                const root = new DOMParser().parseFromString(htmlContent, "text/html").body.firstElementChild;
                const img = root?.querySelector("img");
                const figcaption = root?.querySelector("figcaption");
                if (img || figcaption) {
                    return {
                        src: img?.getAttribute("src") ?? "",
                        alt: img?.getAttribute("alt") ?? "",
                        caption: figcaption?.innerHTML ?? figcaption?.textContent ?? "",
                    };
                }
            } catch {}
        }
        const srcMatch = htmlContent.match(/<img[^>]+src=["']([^"']+)["']/i);
        const altMatch = htmlContent.match(/<img[^>]+alt=["']([^"']+)["']/i);
        const figMatch = htmlContent.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i);
        return {
            src: srcMatch ? srcMatch[1] : "",
            alt: altMatch ? altMatch[1] : "",
            caption: figMatch ? figMatch[1] : "",
        };
    };

    const parsedImg = isImage ? parseImageDetails() : { src: "", alt: "", caption: "" };

    const effectiveImageSrc = getDisplayUrl(
        fileUrl ||
        content?.externalUrl ||
        content?.data?.url ||
        content?.data?.fileUrl ||
        parsedImg.src
    );

    const effectiveImageAlt = content?.title || parsedImg.alt || "Lesson image";
    const effectiveImageCaption = parsedImg.caption || (fileUrl ? htmlContent : "");

    if (!content) {
        return (
            <div className="flex aspect-video min-h-[220px] max-h-[520px] w-full items-center justify-center rounded-2xl border border-border bg-background p-6 text-center">
                <div>
                    <PlayCircle className="mx-auto mb-3 h-12 w-12 text-slate-600 animate-pulse" />
                    <h3 className="text-lg sm:text-2xl font-semibold text-foreground">Select a lesson</h3>
                    <p className="mt-1 text-sm sm:text-base text-muted-foreground">Choose a lesson from the sidebar to begin learning.</p>
                </div>
            </div>
        );
    }

    const isTextLike = (type === "TEXT" || type === "HTML") && !isImage;
    const isPresentationLike = type === "PRESENTATION" || type === "SLIDE";
    const isHtmlLike = isTextLike || isPresentationLike;

    // Current slide-deck format (Composer v2): htmlContent holds a JSON array
    // of {title, columns, backgroundColor} slides authored in the canvas
    // slide editor — see slideElementTypes.ts. A Presentation can also have
    // been added by uploading a .ppt/.pptx file instead (fileUrl set,
    // htmlContent empty), which has no slide JSON to render, so it takes the
    // same file-viewer path as Document/PDF below. Older, pre-Composer-v2
    // presentations stored raw HTML slides separated by <hr>/<!-- slide -->
    // instead of JSON; parseSlides still renders those so existing lessons
    // authored that way don't go blank.
    const slideDeck = isPresentationLike ? parseSlideDeckJson(htmlContent) : [];
    const hasSlideDeck = slideDeck.length > 0;
    const legacySlides = isPresentationLike && !hasSlideDeck ? parseSlides(htmlContent) : [];
    const isLegacySlideShow = legacySlides.length > 1;

    const isFileLike =
        type === "FILE" ||
        type === "DOCUMENT" ||
        type === "PDF" ||
        (isPresentationLike && !hasSlideDeck && Boolean(fileUrl));

    const isSlideShow = hasSlideDeck || isLegacySlideShow;
    const slideCount = hasSlideDeck ? slideDeck.length : legacySlides.length;

    // Click-to-turn on the slide surface: a click on its right half goes to the
    // next slide, the left half to the previous one — the same gesture the PDF
    // viewer offers (see PdfViewer's handleViewportClick). It is bound to the
    // slide body only, never the strip below it, so the Previous/Next buttons
    // and the dot jumps keep their own behaviour instead of being turned twice
    // by one click.
    const handleSlideAreaClick = (event) => {
        if (slideCount <= 1) return;
        // Slide bodies carry authored HTML, which can hold its own links and
        // media controls; those clicks belong to the element, not to paging.
        if (event.target?.closest?.("a, button, input, textarea, select, video, audio, iframe")) return;
        // A click that finishes a text selection shouldn't also turn the slide.
        if (typeof window !== "undefined" && window.getSelection()?.toString()) return;

        const rect = event.currentTarget.getBoundingClientRect();
        const forward = event.clientX - rect.left > rect.width / 2;
        setSlideIndex((prev) =>
            forward ? Math.min(slideCount - 1, prev + 1) : Math.max(0, prev - 1)
        );
    };

    // The player frame is a fixed box that never scrolls, so every type is
    // sized to fit INSIDE it rather than grow past it: video and images
    // letterbox, slides and PDF pages scale to fit, and reading content
    // (text, code, Word documents) reflows into pages (PagedContent) turned
    // from this header. Below xl a VIDEO keeps its 16:9 box and the learn
    // page's frame hugs it (player mode "aspect").
    // Literal strings only — Tailwind emits nothing it cannot see verbatim.
    const fillsFrame = type === "VIDEO";
    const rootSizing = fillsFrame ? "h-full max-xl:h-auto" : "h-full min-h-0";
    const contentAreaSizing = fillsFrame ? "flex-1 max-xl:min-h-0" : "flex-1 min-h-0 overflow-hidden";

    return (
        <div ref={readAloud.scopeRef} className={`bg-background flex flex-col w-full ${rootSizing}`}>
            {/* Header — skipped for VIDEO: the lesson title already shows above the
                player, and the video's own thumbnail/embed carries its title too,
                so this bar was just a third repeat of the same text. Also skipped
                when there's genuinely no title to show and it's not a slideshow
                (e.g. a merged document block from an import with no block title) —
                an icon-only bar with nothing next to it isn't useful, and we don't
                invent a fake title just to fill it. */}
            {type !== "VIDEO" && (content.title || isSlideShow || pdfPage || viewerControls || showReadAloud) && (
            <div
                className={`relative shrink-0 border-b border-border px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-2 bg-background min-h-[52px] max-xl:py-2.5 max-xl:min-h-0${
                    // At xl the learn page floats its Mark as Complete pill over
                    // this header's top-right corner (now always visible, not
                    // just on hover — see page.jsx); keep the header's own
                    // controls (page, zoom, slide count, read aloud) clear of
                    // it. The pill is ~165px wide plus its own 12px inset from
                    // the frame edge (~177px) — pr-44 (176px) left a ~1px
                    // sliver of real overlap, so this rounds up to the next
                    // step instead of shaving the pill or the inset down to
                    // fit an exact width that will just drift again later.
                    reserveHeaderCorner && (isSlideShow || pdfPage || viewerControls || showReadAloud) ? " xl:pr-48" : ""
                }${
                    // With read aloud in it, the header stays pinned at xl, where
                    // the player frame scrolls this whole block — so Pause/Stop
                    // are always reachable in a long lesson. Below xl it already
                    // sits outside the scrolling text.
                    showReadAloud ? " xl:sticky xl:top-0 z-20" : ""
                }`}
            >
                <h2 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2 truncate pr-2">
                    {isSlideShow && <Presentation className="h-4 w-4 text-primary shrink-0" />}
                    {isTextLike && !isSlideShow && <BookOpen className="h-4 w-4 text-primary shrink-0" />}
                    {isFileLike && <FileText className="h-4 w-4 text-primary shrink-0" />}
                    {content.title && (
                        <span
                            className={`truncate${showReadAloud && readAloud.readsTitle ? " tts-chunk" : ""}`}
                            data-tts-chunk={showReadAloud && readAloud.readsTitle ? 0 : undefined}
                        >
                            {content.title}
                        </span>
                    )}
                </h2>
                {isSlideShow && slideCount > 1 && (
                    <span className="text-sm font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full shrink-0">
                        Slide {slideIndex + 1} / {slideCount}
                    </span>
                )}
                {/* The document's own page control, in its own header: the
                    viewer renders one page at a time, so without this a
                    multi-page document could not be read past page 1. It is
                    NOT a second Previous/Next pair below the player — that
                    page-level row was removed as redundant with the lesson's
                    Previous/Next content controls. This moves the document
                    between its own pages only and never touches which lesson
                    content is open. */}
                {pdfPage && (
                    <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
                        <button
                            type="button"
                            onClick={pdfPage.goToPreviousPage}
                            disabled={pdfPage.page <= 1}
                            aria-label="Previous document page"
                            title="Previous document page"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card/90 text-foreground transition hover:border-primary hover:text-primary disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                        >
                            <ChevronLeft size={15} />
                        </button>

                        <span className="px-1 text-[13px] font-bold tabular-nums text-muted-foreground whitespace-nowrap">
                            <span className="sm:hidden">
                                {pdfPage.page} / {pdfPage.total}
                            </span>
                            <span className="hidden sm:inline">
                                Page {pdfPage.page} of {pdfPage.total}
                            </span>
                        </span>

                        <button
                            type="button"
                            onClick={pdfPage.goToNextPage}
                            disabled={pdfPage.page >= pdfPage.total}
                            aria-label="Next document page"
                            title="Next document page"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card/90 text-foreground transition hover:border-primary hover:text-primary disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                        >
                            <ChevronRight size={15} />
                        </button>
                    </div>
                )}

                {viewerControls}

                {/* Read aloud — in the title row, beside the lesson title. */}
                {showReadAloud && (
                    <SpeechControls
                        variant="inline"
                        speech={readAloud.speech}
                        onListen={readAloud.listen}
                        lang={resolveSpeechLang(speechLanguage)}
                        className="min-w-0"
                    />
                )}
            </div>
            )}

            {/* Content Area with fluid aspect ratio */}
            <div className={`relative w-full flex flex-col bg-background ${contentAreaSizing}`}>
                {/* VIDEO — a protected video waits for its playback lease */}
                {protectedVideo && !lease.media && <PlaybackGate lease={lease} />}

                {protectedVideo && lease.status === "lost" && (
                    <div
                        role="alert"
                        className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/80 p-6 text-center"
                    >
                        <PlayCircle className="h-10 w-10 text-amber-500" />
                        <p className="max-w-sm text-sm font-semibold text-white">{lease.message}</p>
                        <Button type="button" size="sm" onClick={lease.retry}>Try again</Button>
                    </div>
                )}

                {type === "VIDEO" && (!protectedVideo || lease.media) && (
                    videoSource.kind === "youtube" ? (
                        /* YouTube plays through the Orange LMS player: our
                           controls over the YouTube IFrame Player API, which
                           stays the playback engine. Same seekTo handle and
                           callbacks as VideoSurface, so resume, auto-advance
                           and sticky-note seeking work either way. */
                        <OrangeVideoPlayer
                            ref={surfaceRef}
                            videoUrl={videoSource.url}
                            title={content?.title || lessonTitle}
                            initialTime={initialTime}
                            onTimeUpdate={onTimeUpdate}
                            onDurationChange={onDurationChange}
                            onEnded={onEnded}
                        />
                    ) : videoSource.kind !== "none" && videoSource.kind !== "invalid" ? (
                        /* The player and nothing else — no title bar, no share
                           control, no external link. The frame keeps its own
                           responsive sizing: it fills the player at xl and
                           falls back to a 16:9 box below it, so the video
                           never overflows its container or distorts. */
                        <VideoSurface
                            ref={surfaceRef}
                            source={videoSource}
                            initialTime={videoInitialTime}
                            onTimeUpdate={handleTimeUpdate}
                            onEnded={onEnded}
                            onDurationChange={onDurationChange}
                            title={content?.title}
                            className="relative w-full h-full bg-black overflow-hidden max-xl:h-auto max-xl:aspect-video [&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:h-full [&_iframe]:w-full"
                            videoClassName="w-full h-full bg-black object-contain"
                        />
                    ) : (
                        <div className="flex h-80 w-full flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-[#0B101D] p-6 text-center">
                            <PlayCircle className="h-10 w-10 text-amber-500 animate-pulse" />
                            <h4 className="text-base font-bold text-foreground">
                                {videoSource.kind === "invalid"
                                    ? "This Video Can't Be Played"
                                    : "No Video Source Provided"}
                            </h4>
                            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                                {videoSource.kind === "invalid"
                                    ? "The video link saved for this item doesn't point at a playable video. Please let your instructor know."
                                    : "No video URL or video file was configured for this video item."}
                            </p>
                        </div>
                    )
                )}

                {/* FILE / DOCUMENT / PDF (PDFs / PPTs / Docs / Resources) */}
                {isFileLike && (
                    /* The link in the chain that hands the viewer a definite
                       height: a flex column taking the content area's
                       remaining space, which each viewer fits its page,
                       slide or reflowed document into. */
                    <div
                        onContextMenu={(e) => e.preventDefault()}
                        onDragStart={(e) => e.preventDefault()}
                        onCopy={(e) => e.preventDefault()}
                        className="w-full flex-1 min-h-0 flex flex-col select-none">
                        {isPdfUrl(displayFileUrl) ? (
                            <PdfViewer fileUrl={displayFileUrl} title={content?.title} hideToolbar fillHeight onPageStateChange={reportPdfPage} readAloud={documentReadAloud} touchZoom={isBelowXl} />
                        ) : isPptUrl(displayFileUrl) ? (
                            /* No fillHeight: the slide area sizes itself from
                               the deck's aspect ratio at every width, and the
                               learn page's frame hugs it (player mode "aspect"). */
                            <PptViewer
                                fileUrl={displayFileUrl}
                                title={content?.title}
                                hideToolbar
                                fillHeight
                                showDownload={false}
                                onControlsRender={setViewerControls}
                            />
                        ) : displayFileUrl && (displayFileUrl.toLowerCase().includes(".doc") || displayFileUrl.toLowerCase().includes(".docx")) ? (
                            /* hideToolbar + onControlsRender, same as PptViewer
                               above: without them DocxViewer drew its own bar,
                               repeating the block title the header already
                               shows. showDownload={false} keeps Download out
                               of the header — a student reads the document
                               here; the only download left is the fallback
                               inside the card shown when the browser can't
                               render the file at all. */
                            <DocxViewer
                                fileUrl={displayFileUrl}
                                title={content?.title} fillHeight
                                hideToolbar
                                showDownload={false}
                                onControlsRender={setViewerControls}
                                onPageStateChange={reportPdfPage}
                                readAloud={documentReadAloud}
                            />
                        ) : displayFileUrl ? (
                            <ExternalDocumentViewer fileUrl={displayFileUrl} title={content?.title} fillHeight className="h-full flex flex-col" readAloud={documentReadAloud} />
                        ) : htmlContent ? (
                            <PagedContent key={content.id} onPageStateChange={reportPdfPage}>
                                <div
                                    onContextMenu={(e) => e.preventDefault()}
                                    onDragStart={(e) => e.preventDefault()}
                                    onCopy={(e) => e.preventDefault()}
                                    className="select-none min-w-0"
                                >
                                    <MarkdownRenderer
                                        source={unescapeFromContentApi(htmlContent || "")}
                                        emptyText="No document content provided."
                                        className="w-full"
                                    />
                                </div>
                            </PagedContent>
                        ) : (
                            <ExternalDocumentViewer fileUrl={displayFileUrl} title={content?.title} fillHeight className="h-full flex flex-col" />
                        )}
                    </div>
                )}

                {/* PRESENTATION — current columns-based slide deck (authored in
                    the canvas slide editor). Mirrors the instructor composer's
                    own read-only preview (DocumentCell's showSlideDeck),
                    reusing the same SlideColumnsView renderer so a deck looks
                    identical for the student and the instructor. */}
                {hasSlideDeck && !isFileLike && (
                    <div className="flex-1 min-h-0 flex flex-col p-3 sm:p-6">
                        {/* A size container, so the 16:9 slide can be as wide as
                            the space allows AND no taller than it: width is
                            the smaller of the full width and the height's 16:9
                            equivalent. SlideColumnsView scales its stage to
                            that width, so the whole slide is always visible. */}
                        <div className="flex-1 min-h-0 flex items-center justify-center [container-type:size]">
                        <div
                            onClick={handleSlideAreaClick}
                            style={{ width: "min(100cqw, 100cqh * 16 / 9)" }}
                            className={slideDeck.length > 1 ? "cursor-pointer" : undefined}
                        >
                            <SlideColumnsView
                                title={slideDeck[slideIndex]?.title}
                                columns={slideDeck[slideIndex]?.columns || []}
                                backgroundColor={slideDeck[slideIndex]?.backgroundColor}
                            />
                        </div>
                        </div>

                        {/* Slide navigation — moves within THIS deck only
                            (slideIndex), never between lesson content items.
                            Labelled with its unit for that reason. */}
                        {slideDeck.length > 0 && (
                            <div className="shrink-0 mt-3 pt-3 border-t border-border flex items-center justify-between gap-2">
                                {slideDeck.length > 1 ? (
                                    <button
                                        type="button"
                                        onClick={() => setSlideIndex(prev => Math.max(0, prev - 1))}
                                        disabled={slideIndex === 0}
                                        className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] bg-muted text-foreground rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-muted transition"
                                    >
                                        <ChevronLeft className="h-4 w-4" /> Prev slide
                                    </button>
                                ) : (
                                    <span aria-hidden="true" />
                                )}

                                <div className="flex flex-col items-center gap-1.5 min-w-0">
                                    <span
                                        aria-live="polite"
                                        className="text-[11px] font-bold text-muted-foreground"
                                    >
                                        Slide {slideIndex + 1} of {slideDeck.length}
                                    </span>
                                    {slideDeck.length > 1 && (
                                        <div className="flex gap-1.5 overflow-x-auto py-1">
                                            {slideDeck.map((_, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() => setSlideIndex(i)}
                                                    aria-label={`Go to slide ${i + 1}`}
                                                    className={`h-2.5 min-w-[10px] rounded-full transition-all ${
                                                        i === slideIndex ? "bg-primary w-6" : "bg-slate-700 w-2.5"
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {slideDeck.length > 1 ? (
                                    <button
                                        type="button"
                                        onClick={() => setSlideIndex(prev => Math.min(slideDeck.length - 1, prev + 1))}
                                        disabled={slideIndex === slideDeck.length - 1}
                                        className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] bg-muted text-foreground rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-muted transition"
                                    >
                                        Next slide <ChevronRight className="h-4 w-4" />
                                    </button>
                                ) : (
                                    <span aria-hidden="true" />
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* IMAGE */}
                {isImage && (
                    <div className="w-full flex-1 min-h-0 flex flex-col items-center justify-center p-3 sm:p-6 overflow-hidden">
                        {effectiveImageSrc ? (
                            <div className="relative w-full flex-1 min-h-0 flex items-center justify-center">
                                <img
                                    src={effectiveImageSrc}
                                    alt={effectiveImageAlt}
                                    draggable={false}
                                    onContextMenu={(e) => e.preventDefault()}
                                    onDragStart={(e) => e.preventDefault()}
                                    className="w-full h-full object-contain object-center rounded-xl shadow-sm select-none pointer-events-auto"
                                />
                            </div>
                        ) : null}
                        {effectiveImageCaption && (
                            <div
                                className="shrink-0 mt-3 prose prose-invert prose-sm max-w-none text-center select-text"
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(effectiveImageCaption) }}
                            />
                        )}
                    </div>
                )}

                {/* AUDIO */}
                {type === "AUDIO" && (
                    <div className="flex h-[220px] flex-col items-center justify-center gap-4 p-6">
                        <Music className="h-16 w-16 text-primary" />
                        <audio controls src={fileUrl} className="w-full max-w-md" />
                    </div>
                )}

                {/* CODE / CODING_EXERCISE */}
                {(type === "CODE" || type === "CODING_EXERCISE") && (
                    /* Paged like prose: long lines wrap to the page width and
                       a long listing continues on the next page, instead of
                       being cut off at the frame's edges. */
                    <PagedContent key={content.id} onPageStateChange={reportPdfPage}>
                        <pre className="m-0 rounded-xl border border-border text-sm sm:text-base select-text">
                            <code
                                className={`hljs${content?.data?.language ? ` language-${content.data.language}` : ""}`}
                                dangerouslySetInnerHTML={{ __html: highlightCode(htmlContent || "", content?.data?.language) }}
                            />
                        </pre>
                    </PagedContent>
                )}

                {/* INTERACTIVE_LAB / EMBED (interactive widgets, simulations, embedded content) */}
                {(type === "EMBED" || type === "INTERACTIVE_LAB") && (
                    (() => {
                        const embedSrc = externalUrl || fileUrl || htmlContent?.match(/src=["']([^"']+)["']/i)?.[1];
                        if (embedSrc) {
                            return (
                                <div className="w-full flex-1 min-h-0 rounded-xl overflow-hidden bg-white">
                                    <iframe
                                        src={embedSrc}
                                        className="w-full h-full border-0"
                                        title={content?.title || "Interactive Content"}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                </div>
                            );
                        }
                        if (htmlContent) {
                            return (
                                <PagedContent key={content.id} onPageStateChange={reportPdfPage}>
                                    <div
                                        className="prose prose-invert prose-sm max-w-none select-text"
                                        dangerouslySetInnerHTML={{
                                            __html: DOMPurify.sanitize(htmlContent, {
                                                ADD_TAGS: ["iframe"],
                                                ADD_ATTR: ["src", "width", "height", "frameborder", "allow", "allowfullscreen", "scrolling", "style", "class"],
                                            }),
                                        }}
                                    />
                                </PagedContent>
                            );
                        }
                        return (
                            <div className="flex h-[220px] items-center justify-center text-base text-muted-foreground">
                                No embed URL configured
                            </div>
                        );
                    })()
                )}

                {/* HTML / TEXT / legacy pre-Composer-v2 PRESENTATION / SLIDE
                    (raw HTML slides separated by <hr>, not the JSON slide
                    deck — that's handled by the "PRESENTATION" block above) */}
                {isHtmlLike && !isFileLike && !hasSlideDeck && (
                    isLegacySlideShow ? (
                        <div className="flex-1 min-h-0 flex flex-col pb-3 sm:pb-6">
                            {/* A slide longer than the frame continues on a
                                second page (header page control) rather than
                                being cut off. */}
                            <PagedContent key={`${content.id}:${slideIndex}`} onPageStateChange={reportPdfPage}>
                                <div
                                    onClick={handleSlideAreaClick}
                                    className={`prose prose-invert max-w-none text-foreground text-lg sm:text-xl leading-relaxed select-text ${
                                        legacySlides.length > 1 ? "cursor-pointer" : ""
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(legacySlides[slideIndex] || "") }}
                                />
                            </PagedContent>

                            {/* Slide navigation — moves within THIS deck only
                                (slideIndex), never between lesson content
                                items. Labelled with its unit for that reason. */}
                            <div className="shrink-0 mx-4 sm:mx-8 pt-3 border-t border-border flex items-center justify-between gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSlideIndex(prev => Math.max(0, prev - 1))}
                                    disabled={slideIndex === 0}
                                    className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] bg-muted text-foreground rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-muted transition"
                                >
                                    <ChevronLeft className="h-4 w-4" /> Prev slide
                                </button>

                                <div className="flex gap-1.5 overflow-x-auto py-1">
                                    {legacySlides.map((_, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => setSlideIndex(i)}
                                            className={`h-2.5 min-w-[10px] rounded-full transition-all ${
                                                i === slideIndex ? "bg-primary w-6" : "bg-slate-700 w-2.5"
                                            }`}
                                        />
                                    ))}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setSlideIndex(prev => Math.min(legacySlides.length - 1, prev + 1))}
                                    disabled={slideIndex === legacySlides.length - 1}
                                    className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] bg-muted text-foreground rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-muted transition"
                                >
                                    Next slide <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <PagedContent key={content.id} onPageStateChange={reportPdfPage}>
                            <div className="select-text min-w-0">
                                <MarkdownRenderer
                                    source={unescapeFromContentApi(htmlContent || "")}
                                    renderedHtml={showReadAloud ? readAloud.html : undefined}
                                    emptyText="No content yet."
                                    className="w-full min-w-0"
                                />
                            </div>
                        </PagedContent>
                    )
                )}

                {/* EXTERNAL LINK */}
                {(type === "EXTERNAL_LINK" || type === "LINK") && (
                    isGoogleSlidesUrl(externalUrl) ? (
                        <iframe
                            src={getGoogleSlidesEmbedUrl(externalUrl)}
                            className="flex-1 min-h-0 w-full border-none"
                            allowFullScreen
                            title={content.title}
                        />
                    ) : (
                        <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-4 p-6 text-center">
                            <ExternalLink className="h-16 w-16 text-primary animate-pulse" />
                            <h3 className="text-xl font-semibold text-foreground">External Resource</h3>
                            <p className="text-sm sm:text-base text-muted-foreground max-w-md">
                                This content is hosted externally. Click below to open it in a new tab.
                            </p>
                            <a
                                href={externalUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-xl bg-orange-600 px-5 py-2.5 min-h-[44px] flex items-center justify-center font-bold text-sm uppercase tracking-wider text-foreground transition hover:bg-orange-700 shadow-lg"
                            >
                                Visit Website
                            </a>
                        </div>
                    )
                )}
            </div>
        </div>
    );
});

export default VideoPlayer;
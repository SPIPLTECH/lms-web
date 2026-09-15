"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

import useChunkHighlight from "@/hooks/useChunkHighlight";
import useTextToSpeech from "@/hooks/useTextToSpeech";
import { renderMarkdownToSafeHtml } from "@/lib/markdown";
import { annotateHtmlForSpeech } from "@/lib/speechDocument";
import { asSentence } from "@/lib/textToSpeech";

const normalize = (text) => (text || "").replace(/\s+/g, " ").replace(/[.!?:;]+$/, "").trim().toLowerCase();

/**
 * Read-aloud for one text lesson block (Markdown/HTML).
 *
 * Returns the block's HTML with sentence spans (render it in place of the
 * normal Markdown output), the reading session, a `listen()` starter, and
 * `scopeRef` — attach it to the element that contains both the title and the
 * body, so the active sentence can be highlighted wherever it is.
 *
 * Reads the title first (unless the body opens with the same heading), then
 * the body sentence by sentence. Speech stops when the block changes or
 * unmounts (see useTextToSpeech).
 */
export default function useLessonReadAloud({ enabled, contentId, title, source, lang }) {
  const speech = useTextToSpeech(enabled && contentId ? `lesson:${contentId}` : null);
  const scopeRef = useRef(null);

  const prepared = useMemo(() => {
    if (!enabled || !source) return null;
    const html = renderMarkdownToSafeHtml(source);
    const titleText = asSentence(title);
    // Annotate once without an offset just to see how the body opens.
    const probe = annotateHtmlForSpeech(html, { lang });
    const readsTitle = Boolean(titleText) && normalize(probe.chunks[0]) !== normalize(titleText);
    const body = readsTitle ? annotateHtmlForSpeech(html, { lang, indexOffset: 1 }) : probe;
    return {
      html: body.html,
      readsTitle,
      chunks: readsTitle ? [titleText, ...body.chunks] : body.chunks,
    };
  }, [enabled, source, title, lang]);

  const chunks = prepared?.chunks;

  // New text for the same block (e.g. the content was edited) invalidates the
  // sentence numbering, so a session in progress can't continue on it.
  const { stop, isEngaged } = speech;
  const engagedRef = useRef(isEngaged);
  engagedRef.current = isEngaged;
  useEffect(() => {
    return () => {
      if (engagedRef.current) stop();
    };
  }, [chunks, stop]);

  const listen = useCallback(() => {
    if (chunks?.length) speech.start(chunks, { lang });
  }, [chunks, lang, speech]);

  // Highlight the sentence being spoken (and bring it into view when it
  // moves off screen). Paused keeps the highlight so the student can see
  // where they'll resume; stopped/finished clears it.
  const highlightIndex = speech.isPlaying || speech.isPaused ? speech.index : -1;
  // Leave room for the sticky reader bar at the top of the scroller.
  useChunkHighlight(scopeRef, highlightIndex, prepared, { topInset: 72 });

  return {
    speech,
    listen,
    scopeRef,
    html: prepared?.html ?? null,
    readsTitle: Boolean(prepared?.readsTitle),
    hasText: Boolean(chunks?.length),
  };
}

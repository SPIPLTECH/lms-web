"use client";

import { useEffect } from "react";

import { revealInScrollParent } from "@/lib/revealInScrollParent";

/**
 * Marks the sentence being read aloud: adds `tts-active` to every element in
 * `scopeRef` carrying `data-tts-chunk="<index>"`, and scrolls it into view when
 * it has moved off screen. Pass -1 to clear. `contentKey` should change when
 * the rendered sentence markup changes, so the highlight is re-applied.
 */
export default function useChunkHighlight(scopeRef, index, contentKey, { topInset = 0 } = {}) {
  useEffect(() => {
    const scope = scopeRef.current;
    if (!scope || index < 0) return undefined;
    const elements = scope.querySelectorAll(`[data-tts-chunk="${index}"]`);
    elements.forEach((el) => el.classList.add("tts-active"));
    if (elements[0]) revealInScrollParent(elements[0], { topInset });
    return () => elements.forEach((el) => el.classList.remove("tts-active"));
  }, [scopeRef, index, contentKey, topInset]);
}

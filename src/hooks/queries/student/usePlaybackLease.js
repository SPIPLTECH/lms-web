"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  startPlayback,
  sendPlaybackHeartbeat,
  stopPlayback,
  stopPlaybackOnUnload,
} from "@/services/playback.service";
import { createLeaseClaim, IDLE_LEASE } from "@/lib/playbackLease";
import { subscribeAuthEvents } from "@/lib/authBroadcast";

const LEASE_API = {
  start: startPlayback,
  heartbeat: sendPlaybackHeartbeat,
  stop: stopPlayback,
  stopOnUnload: stopPlaybackOnUnload,
};

/**
 * The playback lease for one VIDEO item: this account may play on one device
 * at a time, and the server — not this hook — decides who.
 *
 * Lifecycle (the timing rules live in lib/playbackLease.js):
 *  - claimed when the item is opened (`enabled` + `contentId`), and only then
 *    is the media URL known (`media`);
 *  - renewed by a heartbeat at the interval the server returns, and at once
 *    when the tab becomes visible again;
 *  - re-claimed by itself when the server has dropped it (a late heartbeat
 *    from a throttled background tab, another tab of this browser closing):
 *    `media` then carries a new URL;
 *  - stopped when the item changes or the player unmounts, and best-effort
 *    on page hide (the server's TTL covers a browser that just vanishes).
 *
 * status: "idle" | "acquiring" | "active" | "conflict" | "lost" | "error"
 *  - conflict: 409 PLAYBACK_ACTIVE_ON_ANOTHER_DEVICE, on opening or when a
 *    re-claim finds another device playing. Not retried automatically;
 *    `retry()` is for the user's explicit "Try again".
 *  - lost: the server refused the credentials (401/403) or the re-claim, or
 *    this browser signed out in another tab. The caller must pause playback.
 * A dead session (401 SESSION_EXPIRED/INVALID) is also handled globally by
 * the axios interceptor, which signs the user out.
 */
export default function usePlaybackLease(contentId, { enabled = true } = {}) {
  const [state, setState] = useState(IDLE_LEASE);
  const [attempt, setAttempt] = useState(0);
  const claimRef = useRef(null);

  // Claim on open; release on change/unmount.
  useEffect(() => {
    if (!enabled || !contentId) {
      setState(IDLE_LEASE);
      return undefined;
    }

    const claim = createLeaseClaim(contentId, { api: LEASE_API, onChange: setState });
    claimRef.current = claim;
    claim.open();

    return () => {
      claim.close();
      if (claimRef.current === claim) claimRef.current = null;
    };
  }, [contentId, enabled, attempt]);

  // Back on the tab: a hidden tab's timers run about once a minute, so renew
  // (or find the lease gone and re-claim it) before the student presses play.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") claimRef.current?.beatNow();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  // Signed out (or session ended) in another tab of this browser: the server
  // already ended this session's lease, so stop at once rather than at the
  // next heartbeat.
  useEffect(() => subscribeAuthEvents((event) => claimRef.current?.markLost(event.reason)), []);

  // Tab closed / navigated away: tell the server if we can.
  useEffect(() => {
    const onPageHide = () => claimRef.current?.stopOnUnload();
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, []);

  const retry = useCallback(() => setAttempt((count) => count + 1), []);

  return { ...state, retry };
}

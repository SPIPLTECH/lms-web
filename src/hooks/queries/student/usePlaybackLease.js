"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  startPlayback,
  sendPlaybackHeartbeat,
  stopPlayback,
  stopPlaybackOnUnload,
} from "@/services/playback.service";
import {
  getErrorCode,
  isConfirmedAuthRejection,
  messageForCode,
  SESSION_ERROR_CODES,
} from "@/lib/sessionErrors";
import { subscribeAuthEvents } from "@/lib/authBroadcast";

// One in-flight start per item for this page. React re-runs effects (Strict
// Mode in development, quick remounts), and each run used to send its own
// POST /playback/start; a run now joins a start already on its way for the
// same item instead of issuing a second one.
const inflightStarts = new Map();
function startOnce(contentId) {
  const existing = inflightStarts.get(contentId);
  if (existing) return existing;
  const request = startPlayback(contentId).finally(() => {
    if (inflightStarts.get(contentId) === request) inflightStarts.delete(contentId);
  });
  inflightStarts.set(contentId, request);
  return request;
}

/**
 * The playback lease for one VIDEO item: this account may play on one device
 * at a time, and the server — not this hook — decides who.
 *
 * Lifecycle:
 *  - claimed when the item is opened (`enabled` + `contentId`), and only then
 *    is the media URL known (`media`);
 *  - renewed by a heartbeat at the interval the server returns;
 *  - stopped when the item changes or the player unmounts, and best-effort
 *    on page hide (the server's TTL covers a browser that just vanishes).
 *
 * status: "idle" | "acquiring" | "active" | "conflict" | "lost" | "error"
 *  - conflict: 409 PLAYBACK_ACTIVE_ON_ANOTHER_DEVICE. Not retried
 *    automatically; `retry()` is for the user's explicit "Try again".
 *  - lost: the server dropped the lease (PLAYBACK_LEASE_LOST), refused the
 *    credentials on a heartbeat (401/403), or this browser signed out in
 *    another tab. The caller must pause playback.
 * A dead session (401 SESSION_EXPIRED/INVALID) is also handled globally by
 * the axios interceptor, which signs the user out.
 */
const IDLE = { status: "idle", media: null, leaseId: null, errorCode: null, message: null };

export default function usePlaybackLease(contentId, { enabled = true } = {}) {
  const [state, setState] = useState(IDLE);
  const [attempt, setAttempt] = useState(0);
  // { leaseId, contentId, intervalMs } of the lease this hook holds.
  const leaseRef = useRef(null);
  // The item the latest effect run is claiming (null once unmounted).
  const claimingRef = useRef(null);
  // A stop scheduled by a cleanup, cancelled if the next run re-claims the
  // same item. The server updates one lease in place for a session, so an old
  // run's stop arriving after a new run's start (React StrictMode remounts,
  // "Try again") would otherwise end the very lease the new run is using.
  const pendingStopRef = useRef(null);

  const scheduleStop = useCallback((lease) => {
    const timer = window.setTimeout(() => {
      pendingStopRef.current = null;
      if (claimingRef.current) return;
      stopPlayback({ leaseId: lease.leaseId, contentId: lease.contentId, reason: "NAVIGATED_AWAY" }).catch(() => {});
    }, 150);
    pendingStopRef.current = { timer, lease };
  }, []);

  // Claim on open; release on change/unmount.
  useEffect(() => {
    if (!enabled || !contentId) {
      claimingRef.current = null;
      setState(IDLE);
      return undefined;
    }

    let cancelled = false;
    claimingRef.current = contentId;
    if (pendingStopRef.current) {
      window.clearTimeout(pendingStopRef.current.timer);
      pendingStopRef.current = null;
    }
    setState({ ...IDLE, status: "acquiring" });

    startOnce(contentId)
      .then((result) => {
        if (cancelled) {
          // Superseded. Release it only if nothing here wants this session now.
          if (!claimingRef.current) {
            stopPlayback({ leaseId: result.leaseId, contentId, reason: "NAVIGATED_AWAY" }).catch(() => {});
          }
          return;
        }
        leaseRef.current = {
          leaseId: result.leaseId,
          contentId,
          intervalMs: Math.max(5, Number(result.heartbeatIntervalSeconds) || 20) * 1000,
        };
        setState({ ...IDLE, status: "active", media: result.media, leaseId: result.leaseId });
      })
      .catch((error) => {
        if (cancelled) return;
        const code = getErrorCode(error);
        // No response at all: the request timed out or the network dropped.
        // Say so, rather than implying the video itself is broken.
        const fallback = !error?.response
          ? "The video is taking longer than usual to start. Please try again."
          : "This video could not be started. Please try again.";
        setState({
          ...IDLE,
          status: code === SESSION_ERROR_CODES.PLAYBACK_ACTIVE_ON_ANOTHER_DEVICE ? "conflict" : "error",
          errorCode: code,
          message: messageForCode(code, fallback),
        });
      });

    return () => {
      cancelled = true;
      claimingRef.current = null;
      const lease = leaseRef.current;
      leaseRef.current = null;
      // The stop carries the item: if another tab of this browser has since
      // moved the lease to a different video, the server leaves it alone.
      if (lease) scheduleStop(lease);
    };
  }, [contentId, enabled, attempt, scheduleStop]);

  // Heartbeat while the lease is held.
  useEffect(() => {
    if (state.status !== "active" || !leaseRef.current) return undefined;
    const { leaseId, intervalMs } = leaseRef.current;

    const timer = window.setInterval(() => {
      sendPlaybackHeartbeat(leaseId).catch((error) => {
        const code = getErrorCode(error);
        // The lease is gone, or the server refused this browser's credentials
        // (signed out elsewhere, session revoked or expired): stop playing.
        // Anything else (no answer, 5xx) is retried by the next beat; if it
        // persists, the server-side lease simply expires.
        const lost = code === SESSION_ERROR_CODES.PLAYBACK_LEASE_LOST || isConfirmedAuthRejection(error);
        if (!lost) return;
        if (leaseRef.current?.leaseId !== leaseId) return;
        leaseRef.current = null;
        setState((prev) => ({
          ...prev,
          status: "lost",
          errorCode: code || SESSION_ERROR_CODES.PLAYBACK_LEASE_LOST,
          message: messageForCode(code, messageForCode(SESSION_ERROR_CODES.PLAYBACK_LEASE_LOST)),
        }));
      });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [state.status, state.leaseId]);

  // Signed out (or session ended) in another tab of this browser: the server
  // already ended this session's lease, so stop at once rather than at the
  // next heartbeat.
  useEffect(() => {
    return subscribeAuthEvents((event) => {
      if (!leaseRef.current) return;
      leaseRef.current = null;
      setState((prev) => ({
        ...prev,
        status: "lost",
        errorCode: event.reason || SESSION_ERROR_CODES.SIGNED_OUT,
        message: messageForCode(event.reason, messageForCode(SESSION_ERROR_CODES.SIGNED_OUT)),
      }));
    });
  }, []);

  // Tab closed / navigated away: tell the server if we can.
  useEffect(() => {
    const onPageHide = () => {
      const lease = leaseRef.current;
      if (lease) stopPlaybackOnUnload({ leaseId: lease.leaseId, contentId: lease.contentId });
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, []);

  const retry = useCallback(() => setAttempt((count) => count + 1), []);

  return { ...state, retry };
}

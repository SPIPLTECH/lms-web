import {
  getErrorCode,
  isConfirmedAuthRejection,
  isTransientFailure,
  messageForCode,
  SESSION_ERROR_CODES,
} from "./sessionErrors.js";

/**
 * The client side of one playback-lease claim (usePlaybackLease), kept free
 * of React so its timing can be tested (__tests__/playbackLease.test.js).
 *
 * The server decides who may play; this only has to keep the lease it was
 * given, and must not report a loss that is not one:
 *
 *  - Heartbeats are chained, never overlapping: the next one is scheduled
 *    when the previous answer arrives.
 *  - A browser throttles a hidden tab's timers to about once a minute, which
 *    is the lease TTL, so a heartbeat can land just after the server expired
 *    the lease (409 PLAYBACK_LEASE_LOST). Another tab of this browser can
 *    also stop the shared lease when it closes. Either way the lease is
 *    simply re-claimed with POST /playback/start — the same request "Try
 *    again" makes, with the same server checks (access, one device). Only
 *    what that answers is shown: a conflict when another device now holds
 *    the lease, a loss when access is refused.
 *  - A rejected session (401/403) is a real loss: no re-claim.
 *  - No answer at all (network, 5xx) is retried by the next beat.
 *  - Answers that arrive after the claim closed change nothing.
 *  - A stop is sent only once nothing in this page still claims the lease
 *    (item switches, StrictMode remounts and "Try again" re-claim in place).
 */

export const IDLE_LEASE = { status: "idle", media: null, leaseId: null, errorCode: null, message: null };

const STOP_DELAY_MS = 150;

const defaultTimers = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (id) => clearTimeout(id),
};

/**
 * What one page shares between its claims: one in-flight start per item
 * (React re-runs effects; each run joins the start already on its way), and
 * how many claims are open, so a closing claim never stops the lease another
 * one is using.
 */
export function createLeaseRegistry() {
  const inflightStarts = new Map();
  let liveClaims = 0;
  return {
    startOnce(start, contentId) {
      const existing = inflightStarts.get(contentId);
      if (existing) return existing;
      const request = start(contentId).finally(() => {
        if (inflightStarts.get(contentId) === request) inflightStarts.delete(contentId);
      });
      inflightStarts.set(contentId, request);
      return request;
    },
    claim() {
      liveClaims += 1;
      let released = false;
      return () => {
        if (released) return;
        released = true;
        liveClaims -= 1;
      };
    },
    hasLiveClaims: () => liveClaims > 0,
  };
}

const pageRegistry = createLeaseRegistry();

/**
 * api: { start(contentId), heartbeat(leaseId), stop({ leaseId, contentId, reason }),
 *        stopOnUnload({ leaseId, contentId }) }
 * onChange(state): called with every new { status, media, leaseId, errorCode, message }.
 */
export function createLeaseClaim(contentId, { api, onChange, timers = defaultTimers, registry = pageRegistry }) {
  let closed = false;
  // { leaseId, intervalMs } of the lease this claim holds, or null.
  let held = null;
  let state = IDLE_LEASE;
  let timer = null;
  let beating = false;
  const unclaim = registry.claim();

  const emit = (next) => {
    state = next;
    if (!closed) onChange(next);
  };

  const scheduleBeat = () => {
    timers.clear(timer);
    timer = !closed && held ? timers.set(beat, held.intervalMs) : null;
  };

  const hold = (result) => {
    // Roles without a lease (ADMIN, INSTRUCTOR) get their media and nothing to renew.
    held = result?.leaseId
      ? { leaseId: result.leaseId, intervalMs: Math.max(5, Number(result.heartbeatIntervalSeconds) || 20) * 1000 }
      : null;
    emit({ ...IDLE_LEASE, status: "active", media: result?.media ?? null, leaseId: result?.leaseId ?? null });
    scheduleBeat();
  };

  // A start whose claim has since closed: hand the lease back unless another
  // claim in this page is using it.
  const releaseOrphan = (result) => {
    if (!result?.leaseId || registry.hasLiveClaims()) return;
    api.stop({ leaseId: result.leaseId, contentId, reason: "NAVIGATED_AWAY" }).catch(() => {});
  };

  const lose = (code, fallbackCode = SESSION_ERROR_CODES.PLAYBACK_LEASE_LOST) => {
    held = null;
    scheduleBeat();
    emit({
      ...state,
      status: "lost",
      errorCode: code || fallbackCode,
      message: messageForCode(code, messageForCode(fallbackCode)),
    });
  };

  const conflict = (code) => {
    held = null;
    scheduleBeat();
    emit({ ...IDLE_LEASE, status: "conflict", errorCode: code, message: messageForCode(code) });
  };

  const reclaim = (lostLease) => {
    held = null;
    return registry.startOnce(api.start, contentId).then(
      (result) => {
        if (closed) releaseOrphan(result);
        else hold(result);
      },
      (error) => {
        if (closed) return;
        const code = getErrorCode(error);
        if (code === SESSION_ERROR_CODES.PLAYBACK_ACTIVE_ON_ANOTHER_DEVICE) return conflict(code);
        // Unreachable: keep the old lease id; the next beat finds it lost
        // again and retries the claim.
        if (isTransientFailure(error)) {
          held = lostLease;
          return undefined;
        }
        return lose(code);
      }
    );
  };

  function beat() {
    if (closed || !held || beating) return;
    const lease = held;
    beating = true;
    api
      .heartbeat(lease.leaseId)
      .then(
        () => undefined,
        (error) => {
          if (closed || held !== lease) return undefined;
          const code = getErrorCode(error);
          if (code === SESSION_ERROR_CODES.PLAYBACK_LEASE_LOST) return reclaim(lease);
          if (isConfirmedAuthRejection(error)) return lose(code);
          return undefined;
        }
      )
      .finally(() => {
        beating = false;
        scheduleBeat();
      });
  }

  return {
    open() {
      emit({ ...IDLE_LEASE, status: "acquiring" });
      registry.startOnce(api.start, contentId).then(
        (result) => {
          if (closed) releaseOrphan(result);
          else hold(result);
        },
        (error) => {
          if (closed) return;
          const code = getErrorCode(error);
          if (code === SESSION_ERROR_CODES.PLAYBACK_ACTIVE_ON_ANOTHER_DEVICE) return conflict(code);
          // No response at all: the request timed out or the network dropped.
          // Say so, rather than implying the video itself is broken.
          const fallback = !error?.response
            ? "The video is taking longer than usual to start. Please try again."
            : "This video could not be started. Please try again.";
          emit({ ...IDLE_LEASE, status: "error", errorCode: code, message: messageForCode(code, fallback) });
        }
      );
    },

    /** Renew now (the tab is visible again after its timers were throttled). */
    beatNow() {
      if (!held || beating) return;
      timers.clear(timer);
      beat();
    },

    /** This browser signed out (another tab): the server already ended the lease. */
    markLost(reason) {
      if (!held) return;
      lose(reason, SESSION_ERROR_CODES.SIGNED_OUT);
    },

    close() {
      if (closed) return;
      closed = true;
      timers.clear(timer);
      unclaim();
      const lease = held;
      held = null;
      if (!lease) return;
      // Deferred, so a claim opened right after this one (next item, remount)
      // registers first; the stop carries the item, so the server also leaves
      // a lease alone that another tab has since moved to a different video.
      timers.set(() => {
        if (registry.hasLiveClaims()) return;
        api.stop({ leaseId: lease.leaseId, contentId, reason: "NAVIGATED_AWAY" }).catch(() => {});
      }, STOP_DELAY_MS);
    },

    /** Tab closed / navigated away: tell the server if we can. */
    stopOnUnload() {
      if (held) api.stopOnUnload({ leaseId: held.leaseId, contentId });
    },
  };
}

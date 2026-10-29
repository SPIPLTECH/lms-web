import api from "@/lib/axios";
import Cookies from "js-cookie";

import { getApiOrigin } from "@/lib/apiOrigin";
import { getDeviceKey } from "@/lib/authCookies";

/* ---------------- Playback lease ---------------- */

// Starting playback runs the full access check (enrollment + the learning
// sequence gate) and the lease transaction. Against a remote database, while
// the learn page is loading everything else, that has been measured past the
// 15 s default — the server then granted a lease the browser had stopped
// waiting for. Starting is idempotent for the same session, so waiting
// longer is safe.
const PLAYBACK_START_TIMEOUT_MS = 60000;

// Claims this account's single playback lease for a VIDEO item and returns
// { leaseId, expiresAt, heartbeatIntervalSeconds, media }. `media.url` is
// where the video plays from; it is only issued once the lease is held.
export const startPlayback = async (contentId) => {
  const { data } = await api.post("/playback/start", { contentId }, { timeout: PLAYBACK_START_TIMEOUT_MS });
  return data.data ?? data;
};

export const sendPlaybackHeartbeat = async (leaseId) => {
  await api.post("/playback/heartbeat", { leaseId });
};

export const stopPlayback = async ({ leaseId, contentId, reason }) => {
  await api.post("/playback/stop", { leaseId, contentId, reason });
};

export const getPlaybackStatus = async () => {
  const { data } = await api.get("/playback/status");
  return data.data ?? data;
};

/**
 * Best-effort stop while the page is being torn down (tab closed, navigated
 * away). sendBeacon cannot carry the Authorization header, so this is a
 * keepalive fetch instead. It may still never arrive — the lease then expires
 * on its own, which is what correctness relies on.
 */
export const stopPlaybackOnUnload = ({ leaseId, contentId, reason = "NAVIGATED_AWAY" }) => {
  if (typeof window === "undefined" || !leaseId) return;
  const token = Cookies.get("accessToken");
  const deviceKey = getDeviceKey();
  try {
    fetch(`${getApiOrigin()}/playback/stop`, {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(deviceKey ? { "X-Device-Key": deviceKey } : {}),
      },
      body: JSON.stringify({ leaseId, contentId, reason }),
    }).catch(() => {});
  } catch {
    // Unload-time requests are best effort by definition.
  }
};

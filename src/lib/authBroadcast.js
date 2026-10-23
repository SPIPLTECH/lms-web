/**
 * Tells this browser's other tabs that the user signed out, or that the
 * session ended, so they stop showing protected pages and stop playback —
 * and, separately, that the user signed in, so a tab left on the sign-in
 * page drops its old banner and moves on.
 *
 * Uses BroadcastChannel, with a localStorage "storage" event as the fallback
 * for browsers without it. Neither delivers a message back to the tab that
 * sent it. Sign-out events: { type: "logout" | "session-ended", reason?: string }
 * (subscribeAuthEvents). Sign-in: { type: "signed-in" } (subscribeSignedIn) —
 * kept apart so sign-out subscribers (e.g. the playback lease) never see it.
 */

const CHANNEL_NAME = "orange-lms-auth";
const STORAGE_KEY = "orange-lms:auth-event";
const TYPES = new Set(["logout", "session-ended"]);
const SIGNED_IN = "signed-in";

let channel = null;
const getChannel = () => {
  if (typeof window === "undefined" || typeof window.BroadcastChannel !== "function") return null;
  if (!channel) {
    try {
      channel = new window.BroadcastChannel(CHANNEL_NAME);
    } catch {
      channel = null;
    }
  }
  return channel;
};

/** Normalises a received payload; null when it isn't one of our events. */
export function parseAuthEvent(data) {
  if (!data || typeof data !== "object" || !TYPES.has(data.type)) return null;
  return { type: data.type, reason: typeof data.reason === "string" ? data.reason : null };
}

export function publishAuthEvent(event) {
  post(parseAuthEvent(event));
}

/** Tells the other tabs that this browser just signed in. */
export function publishSignedIn() {
  post({ type: SIGNED_IN });
}

function post(payload) {
  if (!payload || typeof window === "undefined") return;
  const bc = getChannel();
  if (bc) {
    try {
      bc.postMessage(payload);
      return;
    } catch {
      // fall through to the storage fallback
    }
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...payload, at: Date.now() }));
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage blocked: other tabs find out on their next request instead.
  }
}

/** Subscribes to sign-out events from other tabs. Returns an unsubscribe function. */
export function subscribeAuthEvents(handler) {
  return subscribe(parseAuthEvent, handler);
}

/** Subscribes to "signed in" from other tabs. Returns an unsubscribe function. */
export function subscribeSignedIn(handler) {
  return subscribe((data) => (data && data.type === SIGNED_IN ? { type: SIGNED_IN } : null), handler);
}

function subscribe(parse, handler) {
  if (typeof window === "undefined") return () => {};

  const bc = getChannel();
  const onMessage = (message) => {
    const event = parse(message?.data);
    if (event) handler(event);
  };
  const onStorage = (storageEvent) => {
    if (storageEvent.key !== STORAGE_KEY || !storageEvent.newValue) return;
    try {
      const event = parse(JSON.parse(storageEvent.newValue));
      if (event) handler(event);
    } catch {
      // not ours
    }
  };

  if (bc) bc.addEventListener("message", onMessage);
  window.addEventListener("storage", onStorage);
  return () => {
    if (bc) bc.removeEventListener("message", onMessage);
    window.removeEventListener("storage", onStorage);
  };
}

// This tab is signing out, or is already on its way to the sign-in page.
// While set, a late 401 or another tab's event must not send it somewhere
// else — e.g. to "/login?reason=SIGNED_OUT" in the middle of its own logout.
// A full navigation resets it (fresh module); the timeout covers a
// navigation that never happens.
const LEAVING_MS = 15 * 1000;
let leavingUntil = 0;

export function beginSignOut(now = Date.now()) {
  leavingUntil = now + LEAVING_MS;
}

export function cancelSignOut() {
  leavingUntil = 0;
}

export function isSigningOut(now = Date.now()) {
  return now < leavingUntil;
}

/**
 * What this tab does when another tab signs out or finds the session ended:
 * nothing if it is already leaving; otherwise clear local state, and on a
 * protected page go to sign in with the event's reason ("signed out in
 * another tab" is only ever said here, where it is true).
 */
export function crossTabSignOutAction(event, { onProtectedPath = false } = {}) {
  if (isSigningOut()) return { type: "ignore" };
  if (!onProtectedPath) return { type: "clear" };
  return { type: "redirect", to: `/login?reason=${encodeURIComponent(event?.reason || "SIGNED_OUT")}` };
}

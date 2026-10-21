/**
 * DT-04 / DT-05: signing out in one tab must reach this browser's other tabs
 * (which then leave protected pages and stop playback). These tests run the
 * real authBroadcast module against an in-memory BroadcastChannel that, like
 * the browser's, delivers to every OTHER channel instance with the same name,
 * and against the localStorage "storage" fallback.
 */

const listeners = new Map(); // type -> Set(handler) on the fake window
const instances = [];

class FakeBroadcastChannel {
  constructor(name) {
    this.name = name;
    this.handlers = new Set();
    instances.push(this);
  }
  postMessage(data) {
    for (const other of instances) {
      if (other !== this && other.name === this.name) other.handlers.forEach((h) => h({ data }));
    }
  }
  addEventListener(type, handler) { if (type === "message") this.handlers.add(handler); }
  removeEventListener(type, handler) { if (type === "message") this.handlers.delete(handler); }
}

const storage = new Map();
globalThis.window = {
  BroadcastChannel: FakeBroadcastChannel,
  addEventListener(type, handler) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(handler); },
  removeEventListener(type, handler) { listeners.get(type)?.delete(handler); },
  localStorage: {
    setItem(k, v) { storage.set(k, v); },
    removeItem(k) { storage.delete(k); },
    getItem(k) { return storage.get(k) ?? null; },
  },
};

const {
  publishAuthEvent,
  subscribeAuthEvents,
  parseAuthEvent,
  publishSignedIn,
  subscribeSignedIn,
  beginSignOut,
  cancelSignOut,
  isSigningOut,
  crossTabSignOutAction,
} = await import("../authBroadcast.js");

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const cases = [];

cases.push({
  name: "only logout / session-ended events are accepted",
  run: () => [
    parseAuthEvent({ type: "logout", reason: "SIGNED_OUT" }),
    parseAuthEvent({ type: "session-ended" }),
    parseAuthEvent({ type: "something-else" }),
    parseAuthEvent("logout"),
    parseAuthEvent(null),
  ],
  expected: [{ type: "logout", reason: "SIGNED_OUT" }, { type: "session-ended", reason: null }, null, null, null],
});

cases.push({
  name: "a logout published by this tab reaches another tab's subscriber, not its own",
  run: () => {
    // The module shares one channel for this "tab"; a second channel instance
    // with the same name stands in for another tab.
    const otherTab = new FakeBroadcastChannel("orange-lms-auth");
    const otherTabGot = [];
    otherTab.addEventListener("message", (m) => otherTabGot.push(parseAuthEvent(m.data)));

    const thisTabGot = [];
    const unsubscribe = subscribeAuthEvents((e) => thisTabGot.push(e));
    publishAuthEvent({ type: "logout", reason: "SIGNED_OUT" });

    // Now the other tab signs out; this tab's subscriber must hear it.
    otherTab.postMessage({ type: "session-ended", reason: "SESSION_INVALID" });
    unsubscribe();
    otherTab.postMessage({ type: "logout" }); // after unsubscribe: ignored
    return [otherTabGot, thisTabGot];
  },
  expected: [
    [{ type: "logout", reason: "SIGNED_OUT" }],
    [{ type: "session-ended", reason: "SESSION_INVALID" }],
  ],
});

cases.push({
  name: "without BroadcastChannel, the storage event carries the sign-out",
  run: async () => {
    // Fresh module instance with no BroadcastChannel available.
    const saved = window.BroadcastChannel;
    delete window.BroadcastChannel;
    const mod = await import(`../authBroadcast.js?nobc=${Date.now()}`);
    window.BroadcastChannel = saved;

    const got = [];
    const unsubscribe = mod.subscribeAuthEvents((e) => got.push(e));
    // What another tab's publishAuthEvent writes, delivered as a storage event.
    for (const handler of listeners.get("storage") || []) {
      handler({ key: "orange-lms:auth-event", newValue: JSON.stringify({ type: "logout", reason: "SIGNED_OUT", at: 1 }) });
      handler({ key: "unrelated", newValue: "x" });
    }
    unsubscribe();
    return got;
  },
  expected: [{ type: "logout", reason: "SIGNED_OUT" }],
});

cases.push({
  name: "cross-tab sign-out: a tab on a protected page goes to sign in with 'signed out in another tab'",
  run: () => {
    cancelSignOut();
    return [
      crossTabSignOutAction({ type: "logout", reason: "SIGNED_OUT" }, { onProtectedPath: true }),
      crossTabSignOutAction({ type: "logout", reason: null }, { onProtectedPath: true }),
      crossTabSignOutAction({ type: "session-ended", reason: "SESSION_INVALID" }, { onProtectedPath: true }),
      crossTabSignOutAction({ type: "logout", reason: "SIGNED_OUT" }, { onProtectedPath: false }),
    ];
  },
  expected: [
    { type: "redirect", to: "/login?reason=SIGNED_OUT" },
    { type: "redirect", to: "/login?reason=SIGNED_OUT" },
    { type: "redirect", to: "/login?reason=SESSION_INVALID" },
    { type: "clear" },
  ],
});

cases.push({
  name: "own-tab logout: while this tab signs out, echoes from other tabs are ignored",
  run: () => {
    cancelSignOut();
    beginSignOut();
    const duringLogout = [
      isSigningOut(),
      crossTabSignOutAction({ type: "session-ended", reason: "SESSION_EXPIRED" }, { onProtectedPath: true }),
      crossTabSignOutAction({ type: "logout", reason: "SIGNED_OUT" }, { onProtectedPath: true }),
    ];
    // Logout failed (server unreachable): the tab stays signed in, and a later
    // genuine cross-tab sign-out is handled normally again.
    cancelSignOut();
    const afterFailedLogout = [
      isSigningOut(),
      crossTabSignOutAction({ type: "logout", reason: "SIGNED_OUT" }, { onProtectedPath: true }),
    ];
    return [duringLogout, afterFailedLogout];
  },
  expected: [
    [true, { type: "ignore" }, { type: "ignore" }],
    [false, { type: "redirect", to: "/login?reason=SIGNED_OUT" }],
  ],
});

cases.push({
  name: "once a tab is leaving for sign-in, a second event cannot replace its reason",
  run: () => {
    cancelSignOut();
    const first = crossTabSignOutAction({ type: "logout", reason: "SIGNED_OUT" }, { onProtectedPath: true });
    beginSignOut(); // what AuthContext does before navigating
    const second = crossTabSignOutAction({ type: "session-ended", reason: "SESSION_EXPIRED" }, { onProtectedPath: true });
    cancelSignOut();
    return [first.type, second.type];
  },
  expected: ["redirect", "ignore"],
});

cases.push({
  name: "the 'leaving' guard expires, so a navigation that never happened cannot mute the tab forever",
  run: () => {
    const t = 1_000_000;
    beginSignOut(t);
    const result = [isSigningOut(t + 1_000), isSigningOut(t + 14_999), isSigningOut(t + 15_000)];
    cancelSignOut();
    return result;
  },
  expected: [true, true, false],
});

cases.push({
  name: "sign-in notice reaches other tabs' sign-in subscribers only, never sign-out subscribers",
  run: () => {
    cancelSignOut();
    const otherTab = new FakeBroadcastChannel("orange-lms-auth");
    const otherTabGot = [];
    otherTab.addEventListener("message", (m) => otherTabGot.push(m.data));

    const signOutHeard = [];
    const signInHeard = [];
    const offOut = subscribeAuthEvents((e) => signOutHeard.push(e));
    const offIn = subscribeSignedIn((e) => signInHeard.push(e));

    publishSignedIn(); // this tab signed in: goes to the other tab only
    otherTab.postMessage({ type: "signed-in" }); // another tab signed in
    otherTab.postMessage({ type: "logout", reason: "SIGNED_OUT" }); // another tab signed out
    offOut();
    offIn();
    return [otherTabGot, signInHeard, signOutHeard];
  },
  expected: [
    [{ type: "signed-in" }],
    [{ type: "signed-in" }],
    [{ type: "logout", reason: "SIGNED_OUT" }],
  ],
});

cases.push({
  name: "the sign-in notice is not a sign-out event (playback lease and session listeners ignore it)",
  run: () => [parseAuthEvent({ type: "signed-in" })],
  expected: [null],
});

let passed = 0;
let failed = 0;
console.log("=== RUNNING AUTH BROADCAST TESTS ===");
for (const tc of cases) {
  let actual;
  try {
    actual = await tc.run();
  } catch (e) {
    actual = `threw: ${e.message}`;
  }
  if (same(actual, tc.expected)) {
    console.log(`[PASS] ${tc.name}`);
    passed++;
  } else {
    console.error(`[FAIL] ${tc.name}`);
    console.error("  Expected:", JSON.stringify(tc.expected));
    console.error("  Actual:  ", JSON.stringify(actual));
    failed++;
  }
}
console.log(`\nRESULTS: ${passed} Passed, ${failed} Failed`);
if (failed > 0) process.exit(1);

import { createLeaseClaim, createLeaseRegistry } from "../playbackLease.js";

/**
 * The client side of the STUDENT playback lease (usePlaybackLease) against an
 * in-memory server that follows backend playback.service.js: one ACTIVE lease
 * per account, a 60 s TTL renewed by heartbeats, a late heartbeat expires the
 * lease (409 PLAYBACK_LEASE_LOST), a start from the holding session/device
 * switches the lease in place, a start from another device is 409
 * PLAYBACK_ACTIVE_ON_ANOTHER_DEVICE, a stop only ends the lease while it is on
 * the stop's item, and signed media URLs work only while their lease lives.
 *
 * Time is a fake clock. A hidden browser tab is modelled the way Chrome's
 * intensive throttling behaves: a 20 s timer fires only once a minute — the
 * cause of the "Playback permission expired" overlay (the audit log showed
 * every HEARTBEAT_TIMEOUT 60.0x s after the last heartbeat).
 */

const TTL_MS = 60_000;
const CONFLICT = "PLAYBACK_ACTIVE_ON_ANOTHER_DEVICE";
const LOST = "PLAYBACK_LEASE_LOST";

const flush = async () => {
  for (let i = 0; i < 20; i += 1) await new Promise((resolve) => setImmediate(resolve));
};

function createClock() {
  let now = 0;
  let seq = 0;
  let hiddenMinMs = 0;
  const queue = new Map();
  return {
    now: () => now,
    hide() { hiddenMinMs = 60_000; },
    show() { hiddenMinMs = 0; },
    pending: () => queue.size,
    timers: {
      set(fn, ms) {
        seq += 1;
        queue.set(seq, { fn, due: now + Math.max(ms, hiddenMinMs) });
        return seq;
      },
      clear(id) { queue.delete(id); },
    },
    async advance(ms) {
      const target = now + ms;
      for (;;) {
        let next = null;
        for (const [id, timer] of queue) {
          if (timer.due <= target && (!next || timer.due < next[1].due)) next = [id, timer];
        }
        if (!next) break;
        queue.delete(next[0]);
        now = next[1].due;
        next[1].fn();
        await flush();
      }
      now = target;
      await flush();
    },
  };
}

const httpError = (status, code) =>
  Object.assign(new Error(code), { response: { status, data: { success: false, error: { code } } } });
const networkError = () => Object.assign(new Error("Network Error"), { code: "ERR_NETWORK" });

function createServer(clock, { latencyMs = 0 } = {}) {
  let seq = 0;
  const leases = new Map();
  const deadSessions = new Set();
  const at = () => clock.now() + latencyMs;
  const live = () => [...leases.values()].find((lease) => lease.status === "ACTIVE");
  const expireStale = () => {
    for (const lease of leases.values()) {
      if (lease.status === "ACTIVE" && lease.expiresAt <= at()) lease.status = "EXPIRED";
    }
  };
  const result = (lease, contentId) => ({
    leaseId: lease.id,
    contentId,
    heartbeatIntervalSeconds: 20,
    leaseRequired: true,
    media: { kind: "file", url: `/playback/media/${lease.id}.${contentId}`, protected: true },
  });

  return {
    leases,
    revoke(device) {
      deadSessions.add(device);
      for (const lease of leases.values()) if (lease.device === device && lease.status === "ACTIVE") lease.status = "REVOKED";
    },
    // GET /playback/media/:token — authorizeMedia: the token's lease must still be live.
    mediaServes(url) {
      const [leaseId] = url.split("/").pop().split(".");
      const lease = leases.get(leaseId);
      return Boolean(lease && lease.status === "ACTIVE" && lease.expiresAt > at() && !deadSessions.has(lease.device));
    },
    apiFor(device) {
      const net = { up: true, heartbeatGate: null };
      const calls = { start: 0, heartbeat: 0, stop: [] };
      const call = (fn) => (...args) =>
        Promise.resolve().then(() => {
          if (!net.up) throw networkError();
          if (deadSessions.has(device)) throw httpError(401, "SESSION_INVALID");
          return fn(...args);
        });
      const heartbeat = call((leaseId) => {
        const lease = leases.get(leaseId);
        if (!lease || lease.device !== device || lease.status !== "ACTIVE") throw httpError(409, LOST);
        if (lease.expiresAt <= at()) {
          lease.status = "EXPIRED";
          throw httpError(409, LOST);
        }
        lease.expiresAt = at() + TTL_MS;
      });
      const stop = call(({ leaseId, contentId }) => {
        calls.stop.push({ leaseId, contentId });
        const lease = leases.get(leaseId);
        if (lease && lease.device === device && lease.status === "ACTIVE" && (!contentId || lease.contentId === contentId)) {
          lease.status = "STOPPED";
        }
      });
      return {
        net,
        calls,
        start: call((contentId) => {
          calls.start += 1;
          expireStale();
          const current = live();
          if (current && current.device !== device) throw httpError(409, CONFLICT);
          if (current) {
            current.contentId = contentId;
            current.expiresAt = at() + TTL_MS;
            return result(current, contentId);
          }
          seq += 1;
          const lease = { id: `L${seq}`, device, contentId, status: "ACTIVE", expiresAt: at() + TTL_MS };
          leases.set(lease.id, lease);
          return result(lease, contentId);
        }),
        heartbeat: (leaseId) => {
          calls.heartbeat += 1;
          // A test can hold heartbeat answers back to model a slow API.
          if (net.heartbeatGate) return net.heartbeatGate.then(() => heartbeat(leaseId));
          return heartbeat(leaseId);
        },
        stop,
        stopOnUnload: (args) => {
          stop(args).catch(() => {});
        },
      };
    },
  };
}

function setup({ latencyMs = 90 } = {}) {
  const clock = createClock();
  const server = createServer(clock, { latencyMs });
  return { clock, server };
}

function openClaim(contentId, { api, clock, registry = createLeaseRegistry() }) {
  const states = [];
  const claim = createLeaseClaim(contentId, { api, onChange: (state) => states.push(state), timers: clock.timers, registry });
  claim.open();
  return {
    claim,
    states,
    registry,
    get state() { return states[states.length - 1]; },
    get everLost() { return states.some((state) => state.status === "lost"); },
  };
}

const cases = [];
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

cases.push(["normal playback: start, then heartbeats keep the one lease alive", async () => {
  const { clock, server } = setup();
  const api = server.apiFor("laptop");
  const view = openClaim("video-1", { api, clock });
  await flush();
  assert(view.state.status === "active", `status ${view.state.status}`);
  assert(view.state.media?.url === "/playback/media/L1.video-1", "media URL issued with the lease");
  await clock.advance(5 * 60_000);
  assert(api.calls.heartbeat === 15, `heartbeats sent: ${api.calls.heartbeat}`);
  assert(api.calls.start === 1, "no extra starts");
  assert(server.leases.get("L1").status === "ACTIVE", "lease still ACTIVE");
  assert(server.mediaServes(view.state.media.url), "media still served");
  assert(!view.everLost, "never lost");
}]);

cases.push(["hidden tab (timers throttled to once a minute) no longer shows the expired overlay", async () => {
  const { clock, server } = setup({ latencyMs: 90 });
  const api = server.apiFor("laptop");
  const view = openClaim("video-1", { api, clock });
  await flush();
  clock.hide();
  await clock.advance(10 * 60_000);
  // The server really did expire the lease each time a heartbeat landed 90 ms late…
  assert([...server.leases.values()].some((lease) => lease.status === "EXPIRED"), "a lease expired while hidden");
  // …and the client took a fresh one at once instead of reporting it lost.
  assert(!view.everLost, `states: ${view.states.map((s) => s.status).join(",")}`);
  assert(view.state.status === "active", `status ${view.state.status}`);
  assert(server.mediaServes(view.state.media.url), "the current media URL is served");
  clock.show();
}]);

cases.push(["returning to the tab renews at once (beatNow) instead of waiting for the next timer", async () => {
  const { clock, server } = setup();
  const api = server.apiFor("laptop");
  const view = openClaim("video-1", { api, clock });
  await flush();
  await clock.advance(10_000);
  const before = api.calls.heartbeat;
  view.claim.beatNow();
  await flush();
  assert(api.calls.heartbeat === before + 1, "one immediate heartbeat");
  assert(clock.pending() === 1, "exactly one heartbeat timer remains scheduled");
}]);

cases.push(["a short network interruption is ignored; the lease survives", async () => {
  const { clock, server } = setup();
  const api = server.apiFor("laptop");
  const view = openClaim("video-1", { api, clock });
  await flush();
  api.net.up = false;
  await clock.advance(25_000); // one failed heartbeat, still inside the 60 s TTL
  api.net.up = true;
  await clock.advance(15_000);
  await clock.advance(60_000);
  assert(view.state.status === "active", `status ${view.state.status}`);
  assert(api.calls.start === 1, "no re-claim needed");
  assert(server.leases.get("L1").status === "ACTIVE", "same lease renewed");
  assert(!view.everLost, "never lost");
}]);

cases.push(["a network/API outage longer than the TTL recovers by re-claiming, not by an error", async () => {
  const { clock, server } = setup();
  const api = server.apiFor("laptop");
  const view = openClaim("video-1", { api, clock });
  await flush();
  api.net.up = false;
  await clock.advance(3 * 60_000);
  assert(view.state.status === "active", "transient failures are not lease loss");
  api.net.up = true;
  await clock.advance(20_000);
  assert(server.leases.get("L1").status === "EXPIRED", "old lease expired on the server");
  assert(view.state.status === "active" && view.state.leaseId === "L2", `re-claimed: ${view.state.leaseId}`);
  assert(!server.mediaServes("/playback/media/L1.video-1"), "the old media URL is refused");
  assert(server.mediaServes(view.state.media.url), "the new media URL is served");
  assert(!view.everLost, "never lost");
}]);

cases.push(["heartbeats never overlap: a slow answer holds the next beat back", async () => {
  const { clock, server } = setup();
  const api = server.apiFor("laptop");
  const view = openClaim("video-1", { api, clock });
  await flush();
  let release;
  api.net.heartbeatGate = new Promise((resolve) => { release = resolve; });
  await clock.advance(20_000);
  view.claim.beatNow();
  await clock.advance(30_000);
  assert(api.calls.heartbeat === 1, `in flight at once: ${api.calls.heartbeat}`);
  api.net.heartbeatGate = null;
  release();
  await flush();
  await clock.advance(20_000);
  assert(api.calls.heartbeat === 2, `next beat only after the answer: ${api.calls.heartbeat}`);
  assert(view.state.status === "active", "still active");
}]);

cases.push(["a stale heartbeat answer from a closed claim cannot touch the current one", async () => {
  const { clock, server } = setup();
  const api = server.apiFor("laptop");
  const registry = createLeaseRegistry();
  const first = openClaim("video-1", { api, clock, registry });
  await flush();
  let release;
  api.net.heartbeatGate = new Promise((resolve) => { release = resolve; });
  await clock.advance(20_000); // first claim's heartbeat is now in flight
  first.claim.close();
  api.net.heartbeatGate = null;
  const second = openClaim("video-1", { api, clock, registry });
  await flush();
  server.leases.get("L1").status = "STOPPED"; // the old answer will now be 409 LOST
  release();
  await flush();
  const firstStatesAfterClose = first.states.length;
  await flush();
  assert(first.states.length === firstStatesAfterClose, "closed claim emits nothing");
  assert(!second.everLost, "current claim not marked lost");
}]);

cases.push(["rapid switching between items keeps one lease and never stops the current item", async () => {
  const { clock, server } = setup();
  const api = server.apiFor("laptop");
  const registry = createLeaseRegistry();
  let view = openClaim("video-1", { api, clock, registry });
  await flush();
  for (const next of ["text-2", "video-3", "quiz-4", "video-5"]) {
    view.claim.close();
    view = openClaim(next, { api, clock, registry });
    await clock.advance(50);
  }
  await clock.advance(2 * 60_000);
  assert(api.calls.stop.length === 0, `stops sent: ${JSON.stringify(api.calls.stop)}`);
  assert(view.state.status === "active", `status ${view.state.status}`);
  assert(server.leases.size === 1 && server.leases.get("L1").contentId === "video-5", "one lease, on the last item");
  assert(!view.everLost, "never lost");
}]);

cases.push(["unmount then quick remount of the same item (StrictMode, Try again) does not stop the lease", async () => {
  const { clock, server } = setup();
  const api = server.apiFor("laptop");
  const registry = createLeaseRegistry();
  const first = openClaim("video-1", { api, clock, registry });
  await flush();
  first.claim.close();
  const second = openClaim("video-1", { api, clock, registry });
  await clock.advance(60_000);
  assert(api.calls.stop.length === 0, "no stop sent");
  assert(server.leases.get("L1").status === "ACTIVE", "lease alive");
  assert(second.state.status === "active" && !second.everLost, "remounted claim healthy");
}]);

cases.push(["leaving the player for good releases the lease (one stop, with its item)", async () => {
  const { clock, server } = setup();
  const api = server.apiFor("laptop");
  const view = openClaim("video-1", { api, clock });
  await flush();
  view.claim.close();
  await clock.advance(1_000);
  assert(api.calls.stop.length === 1 && api.calls.stop[0].contentId === "video-1", "stop sent once");
  assert(server.leases.get("L1").status === "STOPPED", "lease stopped");
  assert(clock.pending() === 0, "no heartbeat left running");
}]);

cases.push(["a start that answers after its claim closed is released only if nothing in the page still claims", async () => {
  const { clock, server } = setup();
  const api = server.apiFor("laptop");
  const registry = createLeaseRegistry();
  const lonely = openClaim("video-1", { api, clock, registry });
  lonely.claim.close(); // closed before the start answered
  await flush();
  assert(api.calls.stop.length === 1, "orphan lease released");
  assert(server.leases.get("L1").status === "STOPPED", "stopped");

  const a = openClaim("video-2", { api, clock, registry });
  a.claim.close();
  const b = openClaim("video-2", { api, clock, registry });
  await flush();
  assert(api.calls.stop.length === 1, "no stop while another claim wants the lease");
  assert(b.state.status === "active", "the live claim holds it");
}]);

cases.push(["two tabs on the same device: closing one does not show the overlay in the other", async () => {
  const { clock, server } = setup();
  const tab1Api = server.apiFor("laptop");
  const tab2Api = server.apiFor("laptop");
  const tab1 = openClaim("video-1", { api: tab1Api, clock, registry: createLeaseRegistry() });
  await flush();
  const tab2 = openClaim("video-1", { api: tab2Api, clock, registry: createLeaseRegistry() });
  await flush();
  assert(tab2.state.leaseId === tab1.state.leaseId, "same session shares one lease");
  tab2.claim.close();
  await clock.advance(1_000);
  assert(server.leases.get("L1").status === "STOPPED", "tab 2's stop ended the shared lease");
  await clock.advance(60_000);
  assert(!tab1.everLost, `tab 1 states: ${tab1.states.map((s) => s.status).join(",")}`);
  assert(tab1.state.status === "active", "tab 1 re-claimed");
  assert(server.mediaServes(tab1.state.media.url), "tab 1 media served");
}]);

cases.push(["two devices: the second gets a conflict while the first plays, and the first is never interrupted", async () => {
  const { clock, server } = setup();
  const laptopApi = server.apiFor("laptop");
  const phoneApi = server.apiFor("phone");
  const laptop = openClaim("video-1", { api: laptopApi, clock });
  await flush();
  const phone = openClaim("video-1", { api: phoneApi, clock });
  await flush();
  assert(phone.state.status === "conflict" && phone.state.errorCode === CONFLICT, `phone: ${phone.state.status}`);
  assert(phone.state.media === null, "phone gets no media");
  assert(phoneApi.calls.heartbeat === 0, "conflict is not retried by itself");
  await clock.advance(3 * 60_000);
  assert(laptop.state.status === "active" && !laptop.everLost, "laptop keeps playing");
  assert(phone.state.status === "conflict", "phone still blocked");
}]);

cases.push(["genuine takeover: the other device claimed the expired lease — the re-claim reports the conflict", async () => {
  const { clock, server } = setup();
  const laptopApi = server.apiFor("laptop");
  const phoneApi = server.apiFor("phone");
  const laptop = openClaim("video-1", { api: laptopApi, clock });
  await flush();
  laptopApi.net.up = false; // laptop goes offline; its lease runs out
  await clock.advance(70_000);
  const phone = openClaim("video-1", { api: phoneApi, clock });
  await flush();
  assert(phone.state.status === "active", "phone takes the expired lease");
  laptopApi.net.up = true;
  await clock.advance(20_000);
  assert(laptop.state.status === "conflict", `laptop: ${laptop.state.status}`);
  assert(laptop.state.media === null, "laptop's player is taken down");
  assert(!server.mediaServes("/playback/media/L1.video-1"), "laptop's old media URL is refused");
  assert(server.mediaServes(phone.state.media.url), "phone keeps playing");
}]);

cases.push(["genuine revocation (session ended): lost, playback stops, no silent re-claim", async () => {
  const { clock, server } = setup();
  const api = server.apiFor("laptop");
  const view = openClaim("video-1", { api, clock });
  await flush();
  const mediaUrl = view.state.media.url;
  server.revoke("laptop");
  await clock.advance(20_000);
  assert(view.state.status === "lost", `status ${view.state.status}`);
  assert(view.state.errorCode === "SESSION_INVALID", `code ${view.state.errorCode}`);
  assert(api.calls.start === 1, "no re-claim after an auth rejection");
  assert(clock.pending() === 0, "heartbeats stop");
  assert(!server.mediaServes(mediaUrl), "media refused after revocation");
}]);

cases.push(["signed out in another tab: lost at once with the sign-out reason", async () => {
  const { clock, server } = setup();
  const api = server.apiFor("laptop");
  const view = openClaim("video-1", { api, clock });
  await flush();
  view.claim.markLost("SIGNED_OUT");
  assert(view.state.status === "lost" && view.state.errorCode === "SIGNED_OUT", `state ${JSON.stringify(view.state)}`);
  assert(view.state.message === "You were signed out in another tab. Please sign in again.", view.state.message);
  assert(clock.pending() === 0, "heartbeats stop");
}]);

cases.push(["a re-claim refused for access (403) reports the loss with its message", async () => {
  const { clock, server } = setup();
  const api = server.apiFor("laptop");
  const view = openClaim("video-1", { api, clock });
  await flush();
  const start = api.start;
  api.start = () => Promise.reject(httpError(403, "CONTENT_ACCESS_DENIED"));
  server.leases.get("L1").status = "EXPIRED";
  await clock.advance(20_000);
  assert(view.state.status === "lost", `status ${view.state.status}`);
  assert(view.state.message === "You do not have access to this content.", view.state.message);
  api.start = start;
}]);

cases.push(["a re-claim that cannot reach the API is retried on the next beat, not reported", async () => {
  const { clock, server } = setup();
  const api = server.apiFor("laptop");
  const view = openClaim("video-1", { api, clock });
  await flush();
  server.leases.get("L1").status = "STOPPED";
  const start = api.start;
  api.start = () => Promise.reject(networkError());
  await clock.advance(20_000);
  assert(view.state.status === "active", "not reported while the API is unreachable");
  api.start = start;
  await clock.advance(20_000);
  assert(view.state.status === "active" && view.state.leaseId === "L2", `re-claimed: ${view.state.leaseId}`);
  assert(!view.everLost, "never lost");
}]);

cases.push(["ADMIN / INSTRUCTOR (no lease required): active with media, no heartbeats", async () => {
  const { clock } = setup();
  const calls = { heartbeat: 0 };
  const api = {
    start: async (contentId) => ({ leaseId: null, contentId, leaseRequired: false, heartbeatIntervalSeconds: null, media: { kind: "file", url: "/uploads/v.mp4", protected: false } }),
    heartbeat: async () => { calls.heartbeat += 1; },
    stop: async () => {},
    stopOnUnload: () => {},
  };
  const view = openClaim("video-1", { api, clock });
  await flush();
  await clock.advance(2 * 60_000);
  view.claim.close();
  await clock.advance(1_000);
  assert(view.state.status === "active" && view.state.media.url === "/uploads/v.mp4", "plays");
  assert(calls.heartbeat === 0, "no heartbeats");
}]);

cases.push(["start failures: conflict vs. no answer vs. refused keep their messages", async () => {
  const { clock } = setup();
  const make = (error) => ({ start: () => Promise.reject(error), heartbeat: async () => {}, stop: async () => {}, stopOnUnload: () => {} });
  const conflict = openClaim("v", { api: make(httpError(409, CONFLICT)), clock });
  const timeout = openClaim("v2", { api: make(networkError()), clock });
  const refused = openClaim("v3", { api: make(httpError(500, "INTERNAL")), clock });
  await flush();
  assert(conflict.state.status === "conflict", "conflict");
  assert(timeout.state.status === "error" && timeout.state.message === "The video is taking longer than usual to start. Please try again.", timeout.state.message);
  assert(refused.state.status === "error" && refused.state.message === "This video could not be started. Please try again.", refused.state.message);
}]);

let passed = 0;
let failed = 0;
for (const [name, run] of cases) {
  try {
    await run();
    console.log(`[PASS] ${name}`);
    passed += 1;
  } catch (error) {
    console.error(`[FAIL] ${name}`);
    console.error(`  ${error.message}`);
    failed += 1;
  }
}
console.log(`\nRESULTS: ${passed} Passed, ${failed} Failed`);
if (failed > 0) process.exit(1);

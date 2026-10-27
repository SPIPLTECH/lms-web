/**
 * F-01 / F-02 / F-05: the Next route handlers that use the Blob read/write
 * token must only talk to Vercel's own hosts, and must only serve a caller
 * the API recognises as signed in. Runs the real lib/server/sessionCaller.js
 * with a fake fetch.
 */
import {
  isAllowedBlobUrl,
  resolveCaller,
  contentAccessFor,
  normalizeUploadsPath,
  createCallerCache,
  resolveCallerWithAccess,
} from "../server/sessionCaller.js";

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const cases = [];

cases.push({
  name: "only https Vercel hosts are allowed (evilvercel.com is not)",
  run: () => [
    isAllowedBlobUrl("https://store.private.blob.vercel-storage.com/a.pdf"),
    isAllowedBlobUrl("https://store.public.blob.vercel-storage.com/x/external-references/r.json"),
    isAllowedBlobUrl("https://vercel.com/api/blob/x"),
    isAllowedBlobUrl("https://api.vercel.com/x"),
    isAllowedBlobUrl("https://evilvercel.com/x.json"),
    isAllowedBlobUrl("https://vercel.com.evil.io/x.json"),
    isAllowedBlobUrl("https://blob.vercel-storage.com.evil.io/x"),
    isAllowedBlobUrl("http://store.public.blob.vercel-storage.com/x"),
    isAllowedBlobUrl("not a url"),
  ],
  expected: [true, true, true, true, false, false, false, false, false],
});

const fakeFetch = (status, body, calls) => async (url, init) => {
  calls.push({ url, headers: init.headers });
  return { ok: status >= 200 && status < 300, status, json: async () => body };
};

cases.push({
  name: "a valid session yields the caller's role; the device key is forwarded",
  run: async () => {
    const calls = [];
    const caller = await resolveCaller({ apiUrl: "http://api", accessToken: "tok", deviceKey: "dev", fetchImpl: fakeFetch(200, { data: { role: "STUDENT" } }, calls) });
    return [caller, calls[0].url, calls[0].headers.Authorization, calls[0].headers["X-Device-Key"]];
  },
  expected: [{ role: "STUDENT" }, "http://api/auth/profile", "Bearer tok", "dev"],
});

cases.push({
  name: "no token, a refused session or an unreachable API means no caller",
  run: async () => {
    const calls = [];
    return [
      await resolveCaller({ apiUrl: "http://api", accessToken: undefined, fetchImpl: fakeFetch(200, {}, calls) }),
      await resolveCaller({ apiUrl: "http://api", accessToken: "tok", fetchImpl: fakeFetch(401, { code: "SESSION_INVALID" }, calls) }),
      await resolveCaller({ apiUrl: "http://api", accessToken: "tok", fetchImpl: async () => { throw new Error("ECONNREFUSED"); } }),
      calls.length, // the no-token case never calls the API
    ];
  },
  expected: [null, null, null, 1],
});

let passed = 0;
let failed = 0;
console.log("=== RUNNING SESSION CALLER TESTS ===");
// Option B: the Blob proxy and the document route refuse a STUDENT's file
// bytes while another device of the account holds the playback lease.
cases.push({
  name: "content access for file routes: a student is blocked only while another device plays",
  run: async () => {
    const opts = { apiUrl: "http://api", accessToken: "tok", deviceKey: "dev" };
    const calls = [];
    const results = [
      await contentAccessFor({ ...opts, role: "STUDENT", fetchImpl: fakeFetch(200, { data: { active: true, heldByThisDevice: false } }, calls) }),
      await contentAccessFor({ ...opts, role: "STUDENT", fetchImpl: fakeFetch(200, { data: { active: true, heldByThisDevice: true } }, calls) }),
      await contentAccessFor({ ...opts, role: "STUDENT", fetchImpl: fakeFetch(200, { data: { active: false, heldByThisDevice: false } }, calls) }),
    ];
    return [results, calls[0].url, calls[0].headers];
  },
  expected: [["blocked", "allowed", "allowed"], "http://api/playback/status", { Authorization: "Bearer tok", "X-Device-Key": "dev" }],
});

cases.push({
  name: "content access fails closed for a student when the check gets no usable answer",
  run: async () => {
    const opts = { apiUrl: "http://api", accessToken: "tok", deviceKey: "dev", role: "STUDENT" };
    const calls = [];
    return [
      await contentAccessFor({ ...opts, fetchImpl: fakeFetch(503, {}, calls) }),
      await contentAccessFor({ ...opts, fetchImpl: fakeFetch(401, { code: "SESSION_INVALID" }, calls) }),
      await contentAccessFor({ ...opts, fetchImpl: fakeFetch(200, { data: {} }, calls) }),
      await contentAccessFor({ ...opts, fetchImpl: async () => { throw new Error("ECONNREFUSED"); } }),
      await contentAccessFor({ ...opts, accessToken: undefined, fetchImpl: fakeFetch(200, {}, calls) }),
    ];
  },
  expected: ["unknown", "unknown", "unknown", "unknown", "unknown"],
});

cases.push({
  name: "content access never limits staff, and does not even ask the API for them",
  run: async () => {
    const calls = [];
    const fetchImpl = fakeFetch(200, { data: { active: true, heldByThisDevice: false } }, calls);
    const results = [
      await contentAccessFor({ role: "INSTRUCTOR", apiUrl: "http://api", accessToken: "t", fetchImpl }),
      await contentAccessFor({ role: "ADMIN", apiUrl: "http://api", accessToken: "t", fetchImpl }),
    ];
    return [results, calls.length];
  },
  expected: [["allowed", "allowed"], 0],
});

// /api/uploads-proxy forwards the caller's session to the API: it must only
// ever fetch a file under /uploads/, never anything the path can be bent to.
cases.push({
  name: "uploads proxy: only files under /uploads/ — no traversal, other routes or hosts",
  run: () => [
    normalizeUploadsPath("/uploads/contents/lesson 1.pdf"),
    normalizeUploadsPath("/uploads/attachments/a.docx"),
    normalizeUploadsPath(encodeURIComponent("/uploads/contents/x.png")),
    normalizeUploadsPath("/uploads/../auth/profile"),
    normalizeUploadsPath("/uploads/contents/%2e%2e/%2e%2e/auth/profile"),
    normalizeUploadsPath("/uploads/contents/%252e%252e/secret"),
    normalizeUploadsPath("/uploads/contents\\..\\x"),
    normalizeUploadsPath("/uploads//contents/x"),
    normalizeUploadsPath("/uploads/contents/x.pdf?token=abc"),
    normalizeUploadsPath("/contents/abc"),
    normalizeUploadsPath("https://evil.example/uploads/x"),
    normalizeUploadsPath("//evil.example/uploads/x"),
    normalizeUploadsPath("/uploads/"),
    normalizeUploadsPath(null),
  ],
  expected: [
    "/uploads/contents/lesson%201.pdf",
    "/uploads/attachments/a.docx",
    "/uploads/contents/x.png",
    null, null, null, null, null, null, null, null, null, null, null,
  ],
});

// ---------------------------------------------------------------------------
// Remembering a successful check (the file proxies' speed-up)
// ---------------------------------------------------------------------------

// A fake API answering /auth/profile with `role` and /playback/status with
// `lease`, counting the calls it gets.
const fakeApi = (role, lease, calls) => async (url) => {
  calls.push(url);
  if (url.endsWith("/auth/profile")) return { ok: Boolean(role), status: role ? 200 : 401, json: async () => ({ data: { role } }) };
  return { ok: true, status: 200, json: async () => ({ data: lease }) };
};
const creds = (fetchImpl) => ({ apiUrl: "http://api", accessToken: "tok", deviceKey: "dev", fetchImpl });

cases.push({
  name: "a student's allowed check is remembered: the next file asks the API nothing",
  run: async () => {
    const calls = [];
    const cache = createCallerCache({ ttlMs: 60_000 });
    const api = fakeApi("STUDENT", { active: false }, calls);
    const first = await resolveCallerWithAccess(creds(api), cache);
    const second = await resolveCallerWithAccess(creds(api), cache);
    return [first, second, calls.length];
  },
  expected: [{ role: "STUDENT", access: "allowed" }, { role: "STUDENT", access: "allowed" }, 2],
});

cases.push({
  name: "a blocked student is asked again every time, never remembered",
  run: async () => {
    const calls = [];
    const cache = createCallerCache({ ttlMs: 60_000 });
    const api = fakeApi("STUDENT", { active: true, heldByThisDevice: false }, calls);
    const first = await resolveCallerWithAccess(creds(api), cache);
    await resolveCallerWithAccess(creds(api), cache);
    return [first.access, calls.length];
  },
  expected: ["blocked", 4],
});

cases.push({
  name: "an instructor is never limited by the lease answer",
  run: async () => {
    const calls = [];
    const api = fakeApi("INSTRUCTOR", { active: true, heldByThisDevice: false }, calls);
    return (await resolveCallerWithAccess(creds(api), createCallerCache())).access;
  },
  expected: "allowed",
});

cases.push({
  name: "no session: nothing is returned and nothing remembered",
  run: async () => {
    const calls = [];
    const cache = createCallerCache();
    const api = fakeApi(null, { active: false }, calls);
    return [await resolveCallerWithAccess(creds(api), cache), cache.size];
  },
  expected: [null, 0],
});

cases.push({
  name: "a remembered check expires after its time, and another session is not served from it",
  run: async () => {
    let now = 0;
    const cache = createCallerCache({ ttlMs: 60_000, now: () => now });
    cache.set("a", { role: "STUDENT", access: "allowed" });
    const fresh = cache.get("a");
    const otherSession = cache.get("b");
    now = 60_001;
    return [Boolean(fresh), otherSession, cache.get("a")];
  },
  expected: [true, null, null],
});

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

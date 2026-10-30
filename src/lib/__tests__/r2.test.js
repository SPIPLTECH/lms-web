/**
 * lib/server/r2.js: /api/blob-proxy signs whatever parseR2Url accepts, so only
 * files in this account's private bucket may pass. Fake settings; signing is
 * local, so nothing reaches the network.
 */
import { parseR2Url, r2ObjectUrl, signedR2Url, uniqueR2Key } from "../server/r2.js";

const R2_ENV = {
  R2_ACCOUNT_ID: "0123456789abcdef0123456789abcdef",
  R2_ACCESS_KEY_ID: "test-access-key",
  R2_SECRET_ACCESS_KEY: "test-secret-key",
  R2_PRIVATE_BUCKET: "lms-private",
};
const HOST = `${R2_ENV.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const cases = [];

cases.push({
  name: "without R2 settings nothing is recognised",
  run: () => parseR2Url(`https://${HOST}/lms-private/a.pdf`),
  expected: null,
  env: false,
});

cases.push({
  name: "stored URLs round-trip, including names with spaces",
  run: () => {
    const key = "Screen Recording 2026-08-13 115645-abc.mp4";
    const url = r2ObjectUrl(key);
    return [url, parseR2Url(url), parseR2Url(`https://${HOST}/lms-private/content-uploads/a.pdf`)];
  },
  expected: [
    `https://${HOST}/lms-private/Screen%20Recording%202026-08-13%20115645-abc.mp4`,
    "Screen Recording 2026-08-13 115645-abc.mp4",
    "content-uploads/a.pdf",
  ],
});

cases.push({
  name: "only our own host and private bucket are accepted",
  run: () =>
    [
      `http://${HOST}/lms-private/a.pdf`,
      "https://ffffffffffffffffffffffffffffffff.r2.cloudflarestorage.com/lms-private/a.pdf",
      `https://evil.example/${HOST}/lms-private/a.pdf`,
      `https://${HOST}/other-bucket/a.pdf`,
      `https://${HOST}/lms-private/`,
      `https://${HOST}/lms-private/../other-bucket/b.pdf`,
      `https://${HOST}/lms-private/%2e%2e/other-bucket/b.pdf`,
      `https://${HOST}/lms-private/a.pdf?x-id=GetObject`,
      `https://user:pw@${HOST}/lms-private/a.pdf`,
      `https://${HOST}:8443/lms-private/a.pdf`,
      "https://abc.private.blob.vercel-storage.com/a.pdf",
      null,
    ].map(parseR2Url),
  expected: Array(12).fill(null),
});

cases.push({
  name: "signed URLs point at the object and expire after 5 minutes",
  run: async () => {
    const signed = new URL(await signedR2Url("content-uploads/a b.pdf"));
    return [
      signed.hostname,
      signed.pathname,
      signed.searchParams.get("X-Amz-Expires"),
      Boolean(signed.searchParams.get("X-Amz-Signature")),
    ];
  },
  expected: [HOST, "/lms-private/content-uploads/a%20b.pdf", "300", true],
});

cases.push({
  name: "upload keys keep the prefix, a safe name and the extension, and are unique",
  run: () => {
    const a = uniqueR2Key("assignment-submissions", "My answer (final).pdf");
    const b = uniqueR2Key("assignment-submissions", "My answer (final).pdf");
    return [/^assignment-submissions\/\d+-My_answer__final_-[0-9a-f]{24}\.pdf$/.test(a), a !== b];
  },
  expected: [true, true],
});

let passed = 0;
let failed = 0;
for (const tc of cases) {
  const saved = Object.fromEntries(Object.keys(R2_ENV).map((k) => [k, process.env[k]]));
  if (tc.env !== false) Object.assign(process.env, R2_ENV);
  else for (const k of Object.keys(R2_ENV)) delete process.env[k];
  let actual;
  try {
    actual = await tc.run();
  } catch (e) {
    actual = `threw: ${e.message}`;
  }
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
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

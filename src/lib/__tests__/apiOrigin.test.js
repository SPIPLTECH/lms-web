/**
 * NEXT_PUBLIC_API_URL is baked into the client bundle as ONE fixed string, but
 * it is read by every browser that opens the app. "localhost" therefore means a
 * different machine in each of them: on the host PC it is the API, on a phone
 * over the Wi-Fi it is the phone. That is the bug apiOrigin.js exists to close,
 * and these tests pin the exact boundary of when it rewrites and when it must
 * keep its hands off.
 *
 * The two rewrites that must NOT happen are the important half: a deployed
 * build pointing at a real API host, and a deliberately pinned LAN IP, both
 * have to survive untouched.
 *
 * The module reads process.env and `window` at import time, so each case is
 * loaded as a fresh module instance via a cache-busting import specifier.
 */

let counter = 0;

/** Imports a fresh copy of apiOrigin.js under the given env + page host. */
async function load({ apiUrl, socketUrl, pageHost }) {
  if (apiUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL;
  else process.env.NEXT_PUBLIC_API_URL = apiUrl;

  if (socketUrl === undefined) delete process.env.NEXT_PUBLIC_SOCKET_URL;
  else process.env.NEXT_PUBLIC_SOCKET_URL = socketUrl;

  if (pageHost === null) delete globalThis.window;
  else globalThis.window = { location: { hostname: pageHost } };

  return import(`../apiOrigin.js?case=${counter++}`);
}

const testCases = [
  {
    name: "browsing on the host PC leaves a loopback API URL alone",
    env: { apiUrl: "http://localhost:5000", pageHost: "localhost" },
    expectApi: "http://localhost:5000",
  },
  {
    name: "127.0.0.1 counts as the host PC too",
    env: { apiUrl: "http://localhost:5000", pageHost: "127.0.0.1" },
    expectApi: "http://localhost:5000",
  },
  {
    name: "browsing over the LAN swaps loopback for the host the page came from",
    env: { apiUrl: "http://localhost:5000", pageHost: "192.168.1.105" },
    expectApi: "http://192.168.1.105:5000",
  },
  {
    name: "the API port is preserved, not copied from the page",
    env: { apiUrl: "http://localhost:8080", pageHost: "10.0.0.42" },
    expectApi: "http://10.0.0.42:8080",
  },
  {
    name: "a deployed API host is never rewritten, whatever host the page is on",
    env: { apiUrl: "https://api.orangetree.example", pageHost: "192.168.1.105" },
    expectApi: "https://api.orangetree.example",
  },
  {
    name: "an explicitly pinned LAN IP is left exactly as configured",
    env: { apiUrl: "http://192.168.1.50:5000", pageHost: "192.168.1.105" },
    expectApi: "http://192.168.1.50:5000",
  },
  {
    name: "on the server (SSR / route handlers) the configured value is used verbatim",
    env: { apiUrl: "http://localhost:5000", pageHost: null },
    expectApi: "http://localhost:5000",
  },
  {
    name: "an unset NEXT_PUBLIC_API_URL still resolves, and still follows the page host",
    env: { apiUrl: undefined, pageHost: "192.168.1.105" },
    expectApi: "http://192.168.1.105:5000",
  },
  {
    name: "a trailing slash never produces a doubled slash when joined",
    env: { apiUrl: "http://localhost:5000/", pageHost: "192.168.1.105" },
    expectApi: "http://192.168.1.105:5000",
  },
  {
    name: "a base path on the API URL survives the host swap",
    env: { apiUrl: "http://localhost:5000/api", pageHost: "192.168.1.105" },
    expectApi: "http://192.168.1.105:5000/api",
  },
  {
    name: "the socket URL falls back to the API origin when unset",
    env: { apiUrl: "http://localhost:5000", pageHost: "192.168.1.105" },
    expectSocket: "http://192.168.1.105:5000",
  },
  {
    name: "an explicit socket URL wins over the API origin, and is rewritten too",
    env: {
      apiUrl: "http://localhost:5000",
      socketUrl: "http://localhost:6001",
      pageHost: "192.168.1.105",
    },
    expectSocket: "http://192.168.1.105:6001",
  },
];

async function runTests() {
  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    const { getApiOrigin, getSocketOrigin } = await load(tc.env);

    const checks = [];
    if (tc.expectApi !== undefined) {
      checks.push(["getApiOrigin()", getApiOrigin(), tc.expectApi]);
    }
    if (tc.expectSocket !== undefined) {
      checks.push(["getSocketOrigin()", getSocketOrigin(), tc.expectSocket]);
    }

    const bad = checks.find(([, actual, expected]) => actual !== expected);
    if (bad) {
      console.error(`[FAIL] ${tc.name}`);
      console.error(`  ${bad[0]} expected: ${bad[2]}`);
      console.error(`  ${bad[0]} actual:   ${bad[1]}`);
      failed++;
    } else {
      console.log(`[PASS] ${tc.name}`);
      passed++;
    }
  }

  delete globalThis.window;

  console.log(`\nRESULTS: ${passed} Passed, ${failed} Failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

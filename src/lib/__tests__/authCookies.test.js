/**
 * middleware.js authorizes /admin, /instructor and /student by reading TWO
 * cookies: `accessToken` and `role`. If either is missing it bounces the
 * request back to "/". That makes the pair an invariant: whenever one is
 * written, the other has to be written with at least as long a life.
 *
 * The bug these tests lock down: login wrote all three cookies, but the axios
 * 401-refresh interceptor re-issued ONLY `accessToken`, with a fresh 1-day
 * expiry. Backend access tokens expire in minutes, so that refresh fires
 * constantly and keeps rolling `accessToken` forward — while `role` kept its
 * original login-time expiry and silently died. The app still looked logged in
 * (accessToken present + cached user), so the navbar rendered "Go to
 * Dashboard", but middleware saw no `role` and bounced every dashboard
 * navigation straight back to the landing page.
 *
 * These run against a fake document.cookie jar so js-cookie behaves exactly as
 * it does in the browser, including attribute parsing.
 */

const jar = new Map();
const attrsByName = new Map();

globalThis.document = {
  get cookie() {
    return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  },
  set cookie(raw) {
    const [pair, ...attrs] = raw.split(";").map((s) => s.trim());
    const eq = pair.indexOf("=");
    const name = pair.slice(0, eq);
    const value = pair.slice(eq + 1);

    const expires = attrs.find((a) => a.toLowerCase().startsWith("expires="));
    if (expires && new Date(expires.slice("expires=".length)) <= new Date()) {
      jar.delete(name);
      attrsByName.delete(name);
      return;
    }
    jar.set(name, value);
    attrsByName.set(name, attrs);
  },
};

const attr = (name, key) => {
  const found = (attrsByName.get(name) || []).find((a) =>
    a.toLowerCase().startsWith(`${key.toLowerCase()}=`)
  );
  return found ? found.slice(key.length + 1) : null;
};

// Same rule middleware.js applies, so the tests assert the decision that
// actually gates the browser rather than a paraphrase of it.
const middlewareAllows = (requiredRole) => {
  const token = jar.get("accessToken");
  const role = jar.get("role");
  return Boolean(token) && role === requiredRole;
};

const reset = () => {
  jar.clear();
  attrsByName.clear();
};

const { setSessionCookies, clearSessionCookies } = await import("../authCookies.js");

function runTests() {
  const cases = [];

  cases.push({
    name: "login writes all three cookies and middleware lets the student through",
    run: () => {
      reset();
      setSessionCookies({ accessToken: "a1", refreshToken: "r1", role: "STUDENT" });
      return [jar.get("accessToken"), jar.get("refreshToken"), jar.get("role"), middlewareAllows("STUDENT")];
    },
    expected: ["a1", "r1", "STUDENT", true],
  });

  cases.push({
    name: "REGRESSION: a token refresh re-issues role alongside accessToken",
    run: () => {
      reset();
      setSessionCookies({ accessToken: "a1", refreshToken: "r1", role: "STUDENT" });
      // What the axios interceptor does on a 401 — it has a new access token
      // and the role it already knows, but no new refresh token.
      setSessionCookies({ accessToken: "a2", role: "STUDENT" });
      return [jar.get("accessToken"), jar.get("role"), middlewareAllows("STUDENT")];
    },
    expected: ["a2", "STUDENT", true],
  });

  cases.push({
    name: "REGRESSION: refreshed role never expires before the refreshed accessToken",
    run: () => {
      reset();
      setSessionCookies({ accessToken: "a2", role: "STUDENT" });
      // Identical expiry is what keeps middleware from seeing a half-session
      // after the browser has been closed and reopened.
      return attr("accessToken", "expires") === attr("role", "expires");
    },
    expected: true,
  });

  cases.push({
    name: "a refresh that carries no refreshToken leaves the existing one alone",
    run: () => {
      reset();
      setSessionCookies({ accessToken: "a1", refreshToken: "r1", role: "STUDENT" });
      setSessionCookies({ accessToken: "a2", role: "STUDENT" });
      return jar.get("refreshToken");
    },
    expected: "r1",
  });

  cases.push({
    name: "self-heal: re-asserting role alone repairs a session missing only role",
    run: () => {
      reset();
      setSessionCookies({ accessToken: "a1", refreshToken: "r1", role: "STUDENT" });
      // The exact broken state users are stuck in today.
      jar.delete("role");
      const brokenBefore = middlewareAllows("STUDENT");
      setSessionCookies({ role: "STUDENT" });
      return [brokenBefore, jar.get("accessToken"), middlewareAllows("STUDENT")];
    },
    expected: [false, "a1", true],
  });

  cases.push({
    name: "a stale role is corrected in place rather than duplicated",
    run: () => {
      reset();
      setSessionCookies({ accessToken: "a1", role: "STUDENT" });
      setSessionCookies({ role: "INSTRUCTOR" });
      return [jar.get("role"), middlewareAllows("STUDENT"), middlewareAllows("INSTRUCTOR")];
    },
    expected: ["INSTRUCTOR", false, true],
  });

  cases.push({
    name: "cookies are written on path=/ so every route reads the same session",
    run: () => {
      reset();
      setSessionCookies({ accessToken: "a1", refreshToken: "r1", role: "STUDENT" });
      return [attr("accessToken", "path"), attr("refreshToken", "path"), attr("role", "path")];
    },
    expected: ["/", "/", "/"],
  });

  cases.push({
    name: "clearing removes the whole session, so middleware blocks again",
    run: () => {
      reset();
      setSessionCookies({ accessToken: "a1", refreshToken: "r1", role: "STUDENT" });
      clearSessionCookies();
      return [jar.has("accessToken"), jar.has("refreshToken"), jar.has("role"), middlewareAllows("STUDENT")];
    },
    expected: [false, false, false, false],
  });

  let passed = 0;
  let failed = 0;
  console.log("=== RUNNING AUTH COOKIE TESTS ===");
  for (const tc of cases) {
    let actual;
    try {
      actual = tc.run();
    } catch (e) {
      actual = `threw: ${e.message}`;
    }
    if (JSON.stringify(actual) === JSON.stringify(tc.expected)) {
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
}

runTests();

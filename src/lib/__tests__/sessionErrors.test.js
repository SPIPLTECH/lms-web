import {
  getErrorCode,
  messageForCode,
  isDeadSessionCode,
  isRefreshable,
  isConfirmedAuthRejection,
  isTransientFailure,
  signInErrorMessage,
  interceptorAction,
  refreshFailureReason,
  consumeLoginReason,
  isContentBlockedError,
  isPlaybackHeldElsewhere,
  isCourseContentPath,
} from "../sessionErrors.js";

/**
 * The client's whole reaction to sign-in, session and playback failures hangs
 * on these: which 401 is worth one refresh (only an expired access token),
 * which means the session is over (sign in again, no retry), and which
 * message a code shows. Getting the first wrong either loops refreshes on a
 * revoked session or signs users out on every access-token expiry.
 */

const axiosError = (status, data) => ({ response: { status, data } });
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const cases = [
  {
    name: "code is read from the spec's error object or the top-level field",
    run: () => [
      getErrorCode(axiosError(409, { error: { code: "SESSION_ALREADY_ACTIVE" } })),
      getErrorCode(axiosError(409, { code: "PLAYBACK_ACTIVE_ON_ANOTHER_DEVICE" })),
      getErrorCode({ code: "SESSION_EXPIRED" }),
      getErrorCode(new Error("network")),
    ],
    expected: ["SESSION_ALREADY_ACTIVE", "PLAYBACK_ACTIVE_ON_ANOTHER_DEVICE", "SESSION_EXPIRED", null],
  },
  {
    // AUTH_REQUIRED (no access token — e.g. another tab signed out) is
    // refreshable since DT-04: the refresh attempt either recovers or, with
    // no refresh credential left, signs this tab out instead of leaving it
    // stranded.
    name: "an expired or missing access token is refreshable; a dead session is not",
    run: () => [
      isRefreshable(axiosError(401, { code: "ACCESS_TOKEN_EXPIRED", message: "Token expired" })),
      isRefreshable(axiosError(401, { code: "SESSION_EXPIRED" })),
      isRefreshable(axiosError(401, { code: "SESSION_INVALID" })),
      isRefreshable(axiosError(401, { code: "AUTH_REQUIRED" })),
      isRefreshable(axiosError(401, { message: "Token expired" })), // pre-code API build
      isRefreshable(axiosError(401, { message: "Unauthorized" })),
    ],
    expected: [true, false, false, true, true, false],
  },
  {
    // DT-03: only a refusal from the server proves the session is over.
    name: "a server refusal is confirmed; no answer, 5xx, 408 and 429 are transient",
    run: () => [
      isConfirmedAuthRejection(axiosError(401, { code: "SESSION_INVALID" })),
      isConfirmedAuthRejection(axiosError(403, { code: "ACCOUNT_SUSPENDED" })),
      isConfirmedAuthRejection(axiosError(500, {})),
      isConfirmedAuthRejection(new Error("Network Error")),
      isTransientFailure(new Error("timeout of 15000ms exceeded")),
      isTransientFailure(axiosError(503, { code: "LOGOUT_FAILED" })),
      isTransientFailure(axiosError(502, {})),
      isTransientFailure(axiosError(429, {})),
      isTransientFailure(axiosError(401, { code: "SESSION_INVALID" })),
      isTransientFailure(axiosError(404, {})),
    ],
    expected: [true, true, false, false, true, true, true, true, false, false],
  },
  {
    name: "logout failure and cross-tab sign-out have their own messages",
    run: () => [messageForCode("LOGOUT_FAILED"), messageForCode("SIGNED_OUT")],
    expected: [
      "We couldn't sign you out because the server didn't respond. Check your connection and try again.",
      "You were signed out in another tab. Please sign in again.",
    ],
  },
  {
    name: "a dead session is recognised; a conflict or lost lease is not a dead session",
    run: () => [
      isDeadSessionCode("SESSION_EXPIRED"),
      isDeadSessionCode("SESSION_INVALID"),
      isDeadSessionCode("ACCOUNT_SUSPENDED"),
      isDeadSessionCode("SESSION_ALREADY_ACTIVE"),
      isDeadSessionCode("PLAYBACK_LEASE_LOST"),
      isDeadSessionCode("ACCESS_TOKEN_EXPIRED"),
    ],
    expected: [true, true, true, false, false, false],
  },
  {
    name: "the specification's messages are shown for its codes",
    run: () => [
      messageForCode("SESSION_ALREADY_ACTIVE"),
      messageForCode("PLAYBACK_ACTIVE_ON_ANOTHER_DEVICE"),
      messageForCode("PLAYBACK_LEASE_LOST"),
      messageForCode("SESSION_EXPIRED"),
      messageForCode("SOMETHING_ELSE", "fallback"),
      messageForCode(null, "fallback"),
    ],
    expected: [
      "This browser is already signing in. Please wait a moment and try again.",
      "This account is already watching on another device. Stop playback on that device to continue watching here.",
      "Playback permission expired. Pause and try again.",
      "Your session expired. Please sign in again.",
      "fallback",
      "fallback",
    ],
  },
  {
    // The screenshot bug: the page used to replace every 409 with its own
    // "already signed in on another device… Sign out there" text.
    name: "a refused sign-in shows the server's message, never a stale hardcoded one",
    run: () => [
      signInErrorMessage(
        axiosError(409, {
          code: "SESSION_ALREADY_ACTIVE",
          message: "Signing in on more than one device is not enabled on this server yet. Please contact your administrator.",
        }),
        "Invalid email or password."
      ),
      signInErrorMessage(
        axiosError(409, {
          message: "This browser is already signing in. Please wait a moment and try again.",
          error: { code: "SESSION_ALREADY_ACTIVE", message: "This browser is already signing in. Please wait a moment and try again." },
        }),
        "Invalid email or password."
      ),
      signInErrorMessage(axiosError(409, { code: "SESSION_ALREADY_ACTIVE" }), "Invalid email or password."),
      signInErrorMessage(axiosError(403, { code: "ACCOUNT_SUSPENDED", message: "Your account has been suspended. Please contact support." }), "x"),
    ],
    expected: [
      "Signing in on more than one device is not enabled on this server yet. Please contact your administrator.",
      "This browser is already signing in. Please wait a moment and try again.",
      "This browser is already signing in. Please wait a moment and try again.",
      "Your account has been suspended. Please contact support.",
    ],
  },
  {
    name: "other sign-in failures keep the generic fallback (no account enumeration)",
    run: () => [
      signInErrorMessage(axiosError(401, { message: "Invalid credentials" }), "Invalid email or password."),
      signInErrorMessage(axiosError(400, { code: "VALIDATION_ERROR", message: "email is required" }), "Invalid email or password."),
      signInErrorMessage({ message: "Network Error" }, "Invalid email or password."),
    ],
    expected: ["Invalid email or password.", "Invalid email or password.", "Invalid email or password."],
  },
  {
    name: "no sign-in message ever tells a user to sign out on another device",
    run: () =>
      ["SESSION_ALREADY_ACTIVE", "ACCOUNT_SUSPENDED", "ACCOUNT_NOT_ALLOWED"].some((code) =>
        /sign out there|signed in on another device/i.test(messageForCode(code) || "")
      ),
    expected: false,
  },
  {
    // Stale-banner fix 2: "signed out in another tab" is only for the real
    // cross-tab event. A 401 with no refresh credential left (expired or
    // cleared cookie, or this tab's own logout) is a neutral expiry.
    name: "a 401 with no refresh credential ends the session as SESSION_EXPIRED, never SIGNED_OUT",
    run: () => [
      interceptorAction(axiosError(401, { code: "AUTH_REQUIRED" }), { hasRefreshToken: false }),
      interceptorAction(axiosError(401, { code: "ACCESS_TOKEN_EXPIRED" }), { hasRefreshToken: false }),
      interceptorAction(axiosError(401, { message: "Token expired" }), { hasRefreshToken: false }),
    ],
    expected: [
      { type: "end", reason: "SESSION_EXPIRED" },
      { type: "end", reason: "SESSION_EXPIRED" },
      { type: "end", reason: "SESSION_EXPIRED" },
    ],
  },
  {
    name: "a refreshable 401 with a refresh credential refreshes once; a retried one does not loop",
    run: () => [
      interceptorAction(axiosError(401, { code: "ACCESS_TOKEN_EXPIRED" }), { hasRefreshToken: true }),
      interceptorAction(axiosError(401, { code: "ACCESS_TOKEN_EXPIRED" }), { hasRefreshToken: true, alreadyRetried: true }),
    ],
    expected: [{ type: "refresh" }, { type: "none" }],
  },
  {
    name: "legitimate session-over codes keep their own reason (expired, revoked, suspended)",
    run: () => [
      interceptorAction(axiosError(401, { code: "SESSION_EXPIRED" }), { hasRefreshToken: true }),
      interceptorAction(axiosError(401, { code: "SESSION_INVALID" }), { hasRefreshToken: true }),
      interceptorAction(axiosError(403, { code: "ACCOUNT_SUSPENDED" }), { hasRefreshToken: true }),
    ],
    expected: [
      { type: "end", reason: "SESSION_EXPIRED" },
      { type: "end", reason: "SESSION_INVALID" },
      { type: "end", reason: "ACCOUNT_SUSPENDED" },
    ],
  },
  {
    name: "transient failures (no answer, timeout, 5xx, 408, 429) never end the session",
    run: () => [
      interceptorAction({ message: "Network Error" }, { hasRefreshToken: false }),
      interceptorAction({ code: "ECONNABORTED", message: "timeout of 15000ms exceeded" }, { hasRefreshToken: false }),
      interceptorAction(axiosError(502, {}), { hasRefreshToken: false }),
      interceptorAction(axiosError(503, { code: "LOGOUT_FAILED" }), { hasRefreshToken: false }),
      interceptorAction(axiosError(408, {}), { hasRefreshToken: false }),
      interceptorAction(axiosError(429, {}), { hasRefreshToken: false }),
    ],
    expected: Array(6).fill({ type: "none" }),
  },
  {
    name: "a playback conflict or access refusal is that request's error, not a sign-out",
    run: () => [
      interceptorAction(axiosError(409, { code: "PLAYBACK_ACTIVE_ON_ANOTHER_DEVICE" }), { hasRefreshToken: false }),
      interceptorAction(axiosError(409, { code: "PLAYBACK_LEASE_LOST" }), { hasRefreshToken: false }),
      interceptorAction(axiosError(403, { code: "CONTENT_ACCESS_DENIED" }), { hasRefreshToken: false }),
      interceptorAction(axiosError(401, { code: "SESSION_INVALID" }), { isAuthRoute: true }),
    ],
    expected: Array(4).fill({ type: "none" }),
  },
  {
    name: "a failed refresh call: transient keeps the credentials, a refusal ends with its reason",
    run: () => [
      refreshFailureReason({ message: "Network Error" }),
      refreshFailureReason(axiosError(500, {})),
      refreshFailureReason(axiosError(429, {})),
      refreshFailureReason(axiosError(401, { code: "SESSION_INVALID" })),
      refreshFailureReason(axiosError(403, { code: "ACCOUNT_SUSPENDED" })),
      refreshFailureReason(axiosError(401, {})),
    ],
    expected: [null, null, null, "SESSION_INVALID", "ACCOUNT_SUSPENDED", "SESSION_EXPIRED"],
  },
  {
    // Stale-banner fix 1: the reason is shown once and removed from the URL.
    name: "the login reason is read once and removed from the URL, other parameters kept",
    run: () => [
      consumeLoginReason("http://localhost:3000/login?reason=SIGNED_OUT"),
      consumeLoginReason("http://localhost:3000/login?returnTo=%2Fstudent%2Fmy-courses&reason=SESSION_EXPIRED#top"),
      consumeLoginReason("http://localhost:3000/login?reason=ACCOUNT_SUSPENDED"),
      consumeLoginReason("http://localhost:3000/login?reason=NOT_A_CODE"),
      consumeLoginReason("http://localhost:3000/login"),
    ],
    expected: [
      { message: "You were signed out in another tab. Please sign in again.", url: "/login", changed: true },
      { message: "Your session expired. Please sign in again.", url: "/login?returnTo=%2Fstudent%2Fmy-courses#top", changed: true },
      { message: "Your account has been suspended. Please contact support.", url: "/login", changed: true },
      { message: null, url: "/login", changed: true },
      { message: null, url: "/login", changed: false },
    ],
  },
  {
    name: "after the reason is consumed, reading the cleaned URL again shows nothing (reload/Back)",
    run: () => {
      const first = consumeLoginReason("http://localhost:3000/login?reason=SIGNED_OUT");
      const reload = consumeLoginReason(`http://localhost:3000${first.url}`);
      return [Boolean(first.message), reload.message, reload.changed];
    },
    expected: [true, null, false],
  },
  {
    // Option B: the workspace-wide block, distinct from any sign-in problem.
    name: "content blocked: the rule's codes are recognised, other refusals are not",
    run: () => [
      isContentBlockedError(axiosError(409, { code: "CONTENT_ACTIVE_ON_ANOTHER_DEVICE" })),
      isContentBlockedError(axiosError(409, { error: { code: "PLAYBACK_ACTIVE_ON_ANOTHER_DEVICE" } })),
      isContentBlockedError(axiosError(409, { code: "PLAYBACK_LEASE_LOST" })),
      isContentBlockedError(axiosError(403, { code: "CONTENT_ACCESS_DENIED" })),
      isContentBlockedError(axiosError(401, { code: "SESSION_INVALID" })),
      isContentBlockedError({ message: "Network Error" }),
    ],
    expected: [true, true, false, false, false, false],
  },
  {
    name: "content blocked is not a sign-out: the interceptor leaves it to the page",
    run: () => [
      interceptorAction(axiosError(409, { code: "CONTENT_ACTIVE_ON_ANOTHER_DEVICE" }), { hasRefreshToken: false }),
      interceptorAction(axiosError(409, { code: "CONTENT_ACTIVE_ON_ANOTHER_DEVICE" }), { hasRefreshToken: true }),
    ],
    expected: [{ type: "none" }, { type: "none" }],
  },
  {
    name: "playback status: blocked only when another device of this account holds the lease",
    run: () => [
      isPlaybackHeldElsewhere({ active: true, heldByThisDevice: false }),
      isPlaybackHeldElsewhere({ active: true, heldByThisDevice: true, leaseId: "l1" }),
      isPlaybackHeldElsewhere({ active: false, heldByThisDevice: false }),
      isPlaybackHeldElsewhere({ active: false, heldByThisDevice: false, leaseRequired: false }),
      isPlaybackHeldElsewhere({ active: true, heldByThisDevice: false, leaseRequired: false }),
      isPlaybackHeldElsewhere(undefined),
      isPlaybackHeldElsewhere(null),
    ],
    expected: [true, false, false, false, false, false, false],
  },
  {
    name: "the guard covers course-content pages only; lists and dashboards stay available",
    run: () => [
      "/student/learn/course-1",
      "/student/learn/course-1?item=abc",
      "/student/courses/course-1",
      "/student/assignments/a1",
      "/student/attempt/q1",
      "/student/result/q1",
      "/student/my-courses",
      "/student/dashboard",
      "/student/assignments",
      "/student/quizzes",
      "/student/courses",
      "/instructor/courses/course-1",
      null,
    ].map(isCourseContentPath),
    expected: [true, true, true, true, true, true, false, false, false, false, false, false, false],
  },
  {
    name: "the blocked message is the documented one",
    run: () => [messageForCode("CONTENT_ACTIVE_ON_ANOTHER_DEVICE")],
    expected: ["This account is currently active on another device. Stop playback on that device to access course content here."],
  },
];

let passed = 0;
let failed = 0;
console.log("=== RUNNING SESSION ERROR TESTS ===");
for (const tc of cases) {
  let actual;
  try {
    actual = tc.run();
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

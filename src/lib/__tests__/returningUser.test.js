/**
 * The login page says "Welcome Back" only when this browser has a record of a
 * previous sign-in, and "Sign In" otherwise (first visit, or straight after
 * registering). These run the real returningUser module against an in-memory
 * localStorage and window event target.
 */

const storage = new Map();
const listeners = new Set();
let storageThrows = false;

const guard = () => {
  if (storageThrows) throw new Error("SecurityError: storage blocked");
};

globalThis.window = {
  localStorage: {
    getItem: (k) => (guard(), storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => (guard(), storage.set(k, String(v))),
    removeItem: (k) => (guard(), storage.delete(k)),
  },
  addEventListener: (type, h) => type === "storage" && listeners.add(h),
  removeEventListener: (type, h) => type === "storage" && listeners.delete(h),
};
const fireStorage = (key) => listeners.forEach((h) => h({ key }));

const {
  RETURNING_USER_KEY,
  hasSignedInBefore,
  markSignedIn,
  clearSignedIn,
  subscribeReturningUser,
} = await import("../returningUser.js");

function runTests() {
  const cases = [
    {
      name: "a fresh browser has not signed in before",
      run: () => (storage.clear(), hasSignedInBefore() === false),
    },
    {
      name: "after a sign-in the browser is a returning user",
      run: () => (storage.clear(), markSignedIn(), hasSignedInBefore() === true),
    },
    {
      name: "the flag stores no identity, only 'true'",
      run: () => (storage.clear(), markSignedIn(), storage.get(RETURNING_USER_KEY) === "true" && storage.size === 1),
    },
    {
      name: "registering (clearSignedIn) turns a returning browser back into 'Sign In'",
      run: () => (storage.clear(), markSignedIn(), clearSignedIn(), hasSignedInBefore() === false),
    },
    {
      name: "signing in after registering makes it a returning user again",
      run: () => (storage.clear(), clearSignedIn(), markSignedIn(), hasSignedInBefore() === true),
    },
    {
      name: "blocked storage reads as 'not signed in before' and never throws",
      run: () => {
        storage.clear();
        storageThrows = true;
        try {
          markSignedIn();
          clearSignedIn();
          return hasSignedInBefore() === false;
        } finally {
          storageThrows = false;
        }
      },
    },
    {
      name: "subscriber is told when the flag changes in another tab",
      run: () => {
        let calls = 0;
        const unsubscribe = subscribeReturningUser(() => calls++);
        fireStorage(RETURNING_USER_KEY);
        unsubscribe();
        return calls === 1;
      },
    },
    {
      name: "subscriber is told when another tab clears all storage",
      run: () => {
        let calls = 0;
        const unsubscribe = subscribeReturningUser(() => calls++);
        fireStorage(null);
        unsubscribe();
        return calls === 1;
      },
    },
    {
      name: "subscriber ignores unrelated keys and stops after unsubscribe",
      run: () => {
        let calls = 0;
        const unsubscribe = subscribeReturningUser(() => calls++);
        fireStorage("theme");
        unsubscribe();
        fireStorage(RETURNING_USER_KEY);
        return calls === 0 && listeners.size === 0;
      },
    },
  ];

  let passed = 0;
  let failed = 0;
  for (const tc of cases) {
    let ok = false;
    try {
      ok = tc.run();
    } catch (e) {
      console.error(e);
    }
    if (ok) {
      console.log(`[PASS] ${tc.name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${tc.name}`);
      failed++;
    }
  }
  console.log(`\nRESULTS: ${passed} Passed, ${failed} Failed`);
  if (failed > 0) process.exit(1);
}

runTests();

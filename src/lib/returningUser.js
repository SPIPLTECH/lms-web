/**
 * Remembers whether someone has signed in on this browser before, so the
 * login page can say "Welcome Back" to a returning user and "Sign In" to
 * everyone else (a first visit, or straight after registering).
 *
 * It is a per-browser flag, not per account: the login page does not know
 * who is asking until they sign in. It holds no identity, only "true".
 * AuthContext keeps the key through sign-out (PRESERVED_ON_LOGOUT_KEYS).
 */

export const RETURNING_USER_KEY = "has_signed_in";

// Storage can throw (blocked site data, some private modes); the flag is a
// nicety, so any failure reads as "not signed in before".
export const hasSignedInBefore = () => {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(RETURNING_USER_KEY) === "true";
  } catch {
    return false;
  }
};

// Called on every successful sign-in (password or Google).
export const markSignedIn = () => {
  try {
    window.localStorage.setItem(RETURNING_USER_KEY, "true");
  } catch {
    // ignore — see hasSignedInBefore
  }
};

// Called when an account has just been registered and verified, so the next
// login page greets it with "Sign In" even on a browser used before.
export const clearSignedIn = () => {
  try {
    window.localStorage.removeItem(RETURNING_USER_KEY);
  } catch {
    // ignore — see hasSignedInBefore
  }
};

// useSyncExternalStore subscriber: another tab signing in, or clearing
// storage (key === null), changes the answer.
export const subscribeReturningUser = (onChange) => {
  const handler = (event) => {
    if (event.key === RETURNING_USER_KEY || event.key === null) onChange();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
};

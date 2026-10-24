"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Cookies from "js-cookie";
import { useQueryClient } from "@tanstack/react-query";

import {
  registerUser,
  loginUser,
  loginWithGoogle,
  logoutUser,
  getProfile,
} from "@/services/auth.service";
import { getMySession } from "@/services/session.service";
import { defaultQueryOptions } from "@/lib/queryOptions";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { setSessionCookies, clearSessionCookies, setDeviceKey } from "@/lib/authCookies";
import { RETURNING_USER_KEY, markSignedIn } from "@/lib/returningUser";
import {
  SESSION_ERROR_CODES,
  getErrorCode,
  isConfirmedAuthRejection,
  messageForCode,
} from "@/lib/sessionErrors";
import {
  publishAuthEvent,
  subscribeAuthEvents,
  publishSignedIn,
  subscribeSignedIn,
  beginSignOut,
  cancelSignOut,
  isSigningOut,
  crossTabSignOutAction,
} from "@/lib/authBroadcast";

// Same prefixes middleware.js guards.
const PROTECTED_PREFIXES = ["/admin", "/instructor", "/student"];
const isOnProtectedPath = () =>
  typeof window !== "undefined" && PROTECTED_PREFIXES.some((prefix) => window.location.pathname.startsWith(prefix));

// After a session check that failed without an answer (offline, timeout,
// 5xx), try again this much later instead of signing the user out.
const VERIFY_RETRY_MS = 20 * 1000;

// While the app is open and visible, confirm the session this often. It is
// activity for the API's idle timeout (so reading a long page without other
// requests does not sign the user out) and it notices promptly when the
// session was ended elsewhere (logout, expiry, admin revocation): the axios
// interceptor then clears local state and sends the user to sign in. A hidden
// tab does not keep the session alive on its own; playback heartbeats do.
const SESSION_KEEPALIVE_MS = 5 * 60 * 1000;

const AuthContext = createContext();

// next-themes (see src/providers/ThemeProvider.tsx) is mounted with no
// custom `storageKey`, so it persists under its library default, "theme".
// Theme is a device UI preference, not session state — logging out must not
// reset it. The "signed in here before" flag must survive too — it is what
// makes the login page say "Welcome Back" after a sign-out.
const PRESERVED_ON_LOGOUT_KEYS = ["theme", RETURNING_USER_KEY];

// Shared with any future consumer that wants the current identity without
// re-fetching it (React Query dedupes/caches on this key).
const AUTH_SESSION_KEY = [QUERY_KEYS.PROFILE];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  // loading: true only while we genuinely don't know who's asking yet
  // (no cookie, or a cookie with nothing cached to render with).
  const [loading, setLoading] = useState(true);
  // isVerifying: background getProfile() confirmation in flight.
  const [isVerifying, setIsVerifying] = useState(false);
  // isVerified: true only after server confirmation (or confirmed unauthenticated status).
  // A cached localStorage user alone DOES NOT set isVerified to true.
  const [isVerified, setIsVerified] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const logoutLocal = () => {
    // 1. Clear all authentication cookies across root and default paths
    clearSessionCookies();

    // 2. Clear all local and session storage — except device UI preferences
    // (theme), which is independent of the authenticated session
    // and must survive logout.
    if (typeof window !== "undefined") {
      const preserved = PRESERVED_ON_LOGOUT_KEYS.map((key) => [key, localStorage.getItem(key)]);
      localStorage.clear();
      preserved.forEach(([key, value]) => {
        if (value !== null) localStorage.setItem(key, value);
      });
      sessionStorage.clear();
    }

    // 3. Clear all React Query cached data. Cancel in-flight queries first —
    // clear() forcibly destroys queries (including ones other providers are
    // still actively fetching, e.g. NotificationProvider), and destroying an
    // active fetch surfaces as an unhandled CancelledError rejection unless
    // it's already been cancelled cleanly beforehand.
    try {
      if (queryClient) {
        queryClient.cancelQueries().finally(() => queryClient.clear());
      }
    } catch (e) {
      console.warn("React query cache clear notice:", e);
    }

    // 4. Reset auth state
    setUser(null);
    setLoading(false);
    setIsVerified(true);
  };

  // Confirms the session against the server. Goes through React Query so
  // concurrent calls dedupe against a single in-flight request instead of
  // firing multiple uncached getProfile() calls. Never blocks the caller —
  // it only updates state when it resolves.
  const verifySession = async () => {
    setIsVerifying(true);
    try {
      const response = await queryClient.fetchQuery({
        queryKey: AUTH_SESSION_KEY,
        queryFn: getProfile,
        ...defaultQueryOptions,
      });
      setUser(response.data);
      if (typeof window !== "undefined") {
        localStorage.setItem("user", JSON.stringify(response.data));
      }
      // The server just told us who this is, so re-assert the `role` cookie
      // middleware reads. This is what repairs a browser that already has a
      // missing or stale role — without it those sessions stay permanently
      // unable to reach their dashboard even after the refresh fix above.
      setSessionCookies({ role: response.data?.role });
      setIsVerified(true);
      return true;
    } catch (error) {
      console.error("Session verification failed:", error);
      if (isConfirmedAuthRejection(error)) {
        // The server refused the session: it really is over.
        logoutLocal();
        setIsVerified(true);
        return false;
      }
      // No answer (offline, timeout, 5xx). The session may be perfectly
      // valid; clearing local credentials here would leave it ACTIVE on the
      // server and lock this user out (one session per account). Keep what
      // we have and check again shortly.
      scheduleVerifyRetry();
      return false;
    } finally {
      setIsVerifying(false);
    }
  };

  const verifyRetryRef = useRef(null);
  const scheduleVerifyRetry = () => {
    if (typeof window === "undefined" || verifyRetryRef.current) return;
    verifyRetryRef.current = window.setTimeout(() => {
      verifyRetryRef.current = null;
      if (Cookies.get("accessToken") || Cookies.get("refreshToken")) verifySession();
    }, VERIFY_RETRY_MS);
  };
  useEffect(() => () => window.clearTimeout(verifyRetryRef.current), []);

  const initializeAuth = async () => {
    const token = Cookies.get("accessToken");

    if (!token) {
      logoutLocal();
      setLoading(false);
      return;
    }

    // Restore cached user from localStorage synchronously to prevent layout flashes
    const cachedUser = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    let hasCachedUser = false;
    if (cachedUser) {
      try {
        setUser(JSON.parse(cachedUser));
        hasCachedUser = true;
      } catch (e) {
        console.warn("Authentication recovery from cache failed:", e);
      }
    }

    if (hasCachedUser) {
      // Unblock initial layout rendering with cached user, but DO NOT consider session
      // verified until verifySession() completes with the server.
      setLoading(false);
      verifySession();
    } else {
      // No cached identity to render with, so we genuinely can't show
      // role-gated UI safely yet — this (rare) path still waits.
      await verifySession();
      setLoading(false);
    }
  };

  useEffect(() => {
    initializeAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Automatic startup dashboard redirects for authenticated users on guest pages.
  // Requires isVerified === true so unverified localStorage cache NEVER triggers guest redirects.
  useEffect(() => {
    if (!loading && isVerified && user) {
      const guestRoutes = [
        "/",
        "/login",
        "/forgot-password",
        "/reset-password",
        "/verify-otp",
        "/evaluator/register"
      ];
      if (guestRoutes.includes(pathname)) {
        let returnTo = null;
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          returnTo = params.get("returnTo") || sessionStorage.getItem("intended_course_return");
          if (returnTo) {
            sessionStorage.removeItem("intended_course_return");
          }
        }
        const defaultDashboard =
          user.role === "ADMIN"
            ? "/admin/dashboard"
            : user.role === "INSTRUCTOR"
            ? "/instructor/courses"
            : "/student/my-courses";
        router.replace(returnTo || defaultDashboard);
      }
    }
  }, [user, loading, isVerified, pathname, router]);

  const register = async (data) => {
    return await registerUser(data);
  };

  // Re-reads the session profile from the server, bypassing the cache — for
  // when something server-side changed the user (an evaluator's feedback
  // being confirmed).
  const refreshUser = async () => {
    await queryClient.invalidateQueries({ queryKey: AUTH_SESSION_KEY, refetchType: "none" });
    return verifySession();
  };

  // Keep-alive / revocation check while signed in and visible.
  useEffect(() => {
    if (!user || !isVerified || typeof window === "undefined") return undefined;

    const check = () => {
      if (document.visibilityState !== "visible") return;
      queryClient
        .fetchQuery({ queryKey: [QUERY_KEYS.SESSION_ME], queryFn: getMySession, staleTime: 0 })
        .catch(() => {
          // A dead session is handled by the axios interceptor (clear + sign
          // in again); a network blip just waits for the next tick.
        });
    };

    const timer = window.setInterval(check, SESSION_KEEPALIVE_MS);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [user, isVerified, queryClient]);

  // Shared by password and Google sign-in: store the session credentials and
  // the device key (issued only for a browser the API has not seen).
  const completeSignIn = (response) => {
    const { accessToken, refreshToken, deviceKey, user } = response.data;

    if (deviceKey) setDeviceKey(deviceKey);
    setSessionCookies({ accessToken, refreshToken, role: user.role });

    if (typeof window !== "undefined") {
      localStorage.setItem("user", JSON.stringify(user));
      sessionStorage.setItem("fresh_login", "true");
      markSignedIn();
    }

    // Seed the same cache key verifySession() reads, so the freshly-logged-in
    // user isn't immediately re-fetched via another getProfile() call.
    queryClient.setQueryData(AUTH_SESSION_KEY, { success: true, data: user });

    setUser(user);
    setIsVerified(true);
    // Other tabs left on the sign-in page drop their old banner and move on.
    publishSignedIn();
    return user;
  };

  // A rejected sign-in (409 SESSION_ALREADY_ACTIVE and others) throws to the
  // caller, which shows the message. Nothing here retries it.
  const login = async (credentials) => {
    const response = await loginUser({
      ...credentials,
      // Proves this browser already holds the session, if it does, so the
      // same device can sign in again instead of being refused.
      currentRefreshToken: Cookies.get("refreshToken") || undefined,
    });
    return completeSignIn(response);
  };

  const googleLogin = async (credential) => {
    const response = await loginWithGoogle({
      credential,
      currentRefreshToken: Cookies.get("refreshToken") || undefined,
    });
    return completeSignIn(response);
  };

  /**
   * Signs out. Local state is cleared only once the server has ended the
   * session and its playback lease — or has refused the credentials, which
   * means the session was already gone. If the server can't be reached, the
   * user stays signed in and gets `{ ok: false, message }` to show: claiming
   * success would leave the session ACTIVE, refusing every other sign-in.
   */
  const logout = async () => {
    // From here on this tab is leaving: a request that 401s while (or just
    // after) the server ends the session, or another tab's echo of this
    // sign-out, must not redirect it to "/login?reason=…" — it goes to "/".
    beginSignOut();
    try {
      const refreshToken = Cookies.get("refreshToken");
      await logoutUser(refreshToken);
    } catch (error) {
      if (!isConfirmedAuthRejection(error)) {
        cancelSignOut();
        console.warn("Logout failed; staying signed in:", error?.message || error);
        return {
          ok: false,
          message: messageForCode(
            getErrorCode(error),
            messageForCode(SESSION_ERROR_CODES.LOGOUT_FAILED)
          ),
        };
      }
    }

    publishAuthEvent({ type: "logout", reason: SESSION_ERROR_CODES.SIGNED_OUT });
    logoutLocal();
    if (typeof window !== "undefined") {
      // Hard navigation (not router.replace) so every provider in the tree
      // (sockets, notifications, chat, etc.) resets cleanly — and
      // .replace() so the protected page we're leaving isn't left in
      // history as the back-button target.
      window.location.replace("/");
    }
    return { ok: true };
  };

  // Another tab signed out, or found the session ended: the cookies are
  // shared, so this tab is signed out too. Leaving the protected page also
  // unmounts any player, which stops its playback.
  // Ignored while this tab is itself signing out or already leaving.
  useEffect(() => {
    return subscribeAuthEvents((event) => {
      const action = crossTabSignOutAction(event, { onProtectedPath: isOnProtectedPath() });
      if (action.type === "ignore") return;
      logoutLocal();
      if (action.type === "redirect") {
        beginSignOut();
        window.location.replace(action.to);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Another tab signed in. A tab still on a guest page (e.g. the sign-in page
  // with an old "signed out" banner) confirms the session with the server;
  // the guest-page effect above then takes it to the dashboard. Only an
  // explicit sign-in publishes this — confirming does not — so tabs cannot
  // set each other off in a loop.
  useEffect(() => {
    return subscribeSignedIn(() => {
      // Without the shared cookie the check would only 401 — and that would
      // announce a sign-out to the tab that just signed in.
      if (isSigningOut() || isOnProtectedPath() || !Cookies.get("accessToken")) return;
      verifySession();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isVerifying,
        isVerified,
        login,
        googleLogin,
        register,
        logout,
        logoutLocal,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
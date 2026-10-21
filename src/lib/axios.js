import axios from "axios";
import Cookies from "js-cookie";

import { setSessionCookies, clearSessionCookies, getDeviceKey } from "@/lib/authCookies";
import { getApiOrigin } from "@/lib/apiOrigin";
import { interceptorAction, refreshFailureReason } from "@/lib/sessionErrors";
import { publishAuthEvent, beginSignOut, isSigningOut } from "@/lib/authBroadcast";

// Same prefixes middleware.js guards. Used below to decide whether a failed
// background session check is allowed to navigate the browser at all.
const PROTECTED_PREFIXES = ["/admin", "/instructor", "/student"];

// middleware.js needs `role` as well as `accessToken`, so a refresh has to
// re-issue both. The refreshed session belongs to the same user, so the role
// is whatever we already know: the response's own role if the backend sends
// one, else the verified profile cached at login, else the current cookie.
const resolveSessionRole = (refreshPayload) => {
  const fromResponse = refreshPayload?.role || refreshPayload?.user?.role;
  if (fromResponse) return fromResponse;

  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem("user");
      if (cached) {
        const role = JSON.parse(cached)?.role;
        if (role) return role;
      }
    } catch {
      // Unparseable cache is no worse than no cache — fall through.
    }
  }

  return Cookies.get("role") || null;
};

const api = axios.create({
  baseURL: getApiOrigin(),
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor
api.interceptors.request.use(
  (config) => {
    // Re-resolved per request rather than trusted from creation time: the
    // instance above is built when this module is first evaluated, which on an
    // SSR'd page happens on the server, where there is no page host to read.
    // Asking again here means the first client-side request already uses the
    // host this browser actually reached the app on. See lib/apiOrigin.js.
    config.baseURL = getApiOrigin();

    const token = Cookies.get("accessToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // The API binds each session to the browser it was issued to and checks
    // this on every request (and at sign-in, to recognise the same device).
    const deviceKey = getDeviceKey();
    if (deviceKey) {
      config.headers["X-Device-Key"] = deviceKey;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Don't try to refresh for auth endpoints
    const isAuthRoute =
      originalRequest?.url?.includes("/auth/login") ||
      originalRequest?.url?.includes("/auth/google") ||
      originalRequest?.url?.includes("/auth/register") ||
      originalRequest?.url?.includes("/auth/logout") ||
      originalRequest?.url?.includes("/auth/refresh-token");

    // The session itself is over (logged out, expired, revoked, account
    // suspended — or a 401 with no refresh credential left): no refresh can
    // revive it, so drop local auth state and send the user to sign in.
    // Anything else, including no answer at all, is this request's own error.
    const refreshToken = Cookies.get("refreshToken");
    const action = interceptorAction(error, {
      isAuthRoute,
      alreadyRetried: Boolean(originalRequest?._retry),
      hasRefreshToken: Boolean(refreshToken),
    });

    if (action.type === "end") {
      endLocalSession(action.reason);
      return Promise.reject(error);
    }

    if (action.type === "refresh") {
      originalRequest._retry = true;

      let newAccessToken;
      try {
        // Bare axios, so the interceptor above does not apply — resolve here
        // too, and send the device key the session is bound to.
        const deviceKey = getDeviceKey();
        const response = await axios.post(
          `${getApiOrigin()}/auth/refresh-token`,
          {
            refreshToken,
          },
          deviceKey ? { headers: { "X-Device-Key": deviceKey } } : undefined
        );

        newAccessToken =
          response.data.data.accessToken;

        // Both cookies, same lifetime — writing accessToken alone here is
        // what used to strand `role` and get every dashboard navigation
        // bounced back to "/" by middleware.
        setSessionCookies({
          accessToken: newAccessToken,
          role: resolveSessionRole(response.data.data),
        });
      } catch (refreshError) {
        // Only a refusal from the server ends the session here. A timeout,
        // network drop or 5xx says nothing about the session: throwing the
        // credentials away would leave the server session ACTIVE although
        // this browser could no longer use it.
        const reason = refreshFailureReason(refreshError);
        if (reason) endLocalSession(reason);
        return Promise.reject(refreshError);
      }

      // Retried outside the refresh's try: the retry failing for its own
      // reasons (a 409 conflict, a 403 on that resource, a 500) is that
      // request's error, not a reason to sign the user out.
      originalRequest.headers.Authorization =
        `Bearer ${newAccessToken}`;

      return api(originalRequest);
    }

    return Promise.reject(error);
  }
);

/**
 * Clears this browser's session state and, on a protected page, sends the
 * user to sign in with the reason (the login page shows the matching
 * message). The device key is kept: this is still the same device.
 */
function endLocalSession(reason) {
  // This tab is signing out itself (logout() does the cleanup and navigates
  // to "/"), or is already on its way to the sign-in page: a late 401 must
  // not redirect it again with a different reason.
  if (isSigningOut()) return;

  clearSessionCookies();

  if (typeof window === "undefined") return;
  localStorage.removeItem("user");

  // The cookies are shared by every tab of this browser, so the session is
  // over for all of them: tell the others now rather than on their next call.
  publishAuthEvent({ type: "session-ended", reason });

  // Only force-navigate when the page the browser is actually showing
  // requires auth. A failed *background* session check (e.g. the silent
  // verifySession() call every page fires on load) must not hijack navigation
  // away from a public page. Protected pages still redirect: their own layout
  // guard (and middleware, on a full load) send an unauthenticated visitor
  // away regardless, so this is belt-and-suspenders there.
  const isOnProtectedPath = PROTECTED_PREFIXES.some((prefix) =>
    window.location.pathname.startsWith(prefix)
  );
  if (isOnProtectedPath) {
    beginSignOut();
    const query = reason ? `?reason=${encodeURIComponent(reason)}` : "";
    window.location.replace(`/login${query}`);
  }
}

export default api;
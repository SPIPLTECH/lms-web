import axios from "axios";
import Cookies from "js-cookie";

import { setSessionCookies, clearSessionCookies } from "@/lib/authCookies";

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
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get("accessToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
      originalRequest?.url?.includes("/auth/register") ||
      originalRequest?.url?.includes("/auth/logout") ||
      originalRequest?.url?.includes("/auth/refresh-token");

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthRoute
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = Cookies.get("refreshToken");

        if (!refreshToken) {
          throw new Error("Refresh token missing");
        }

        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh-token`,
          {
            refreshToken,
          }
        );

        const newAccessToken =
          response.data.data.accessToken;

        // Both cookies, same lifetime — writing accessToken alone here is
        // what used to strand `role` and get every dashboard navigation
        // bounced back to "/" by middleware.
        setSessionCookies({
          accessToken: newAccessToken,
          role: resolveSessionRole(response.data.data),
        });

        originalRequest.headers.Authorization =
          `Bearer ${newAccessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        clearSessionCookies();

        localStorage.removeItem("user");

        // Only force-navigate when the page the browser is actually showing
        // requires auth. A failed *background* session check (e.g. the
        // silent verifySession() call every page fires on load) must not
        // hijack navigation away from a public page like a course detail
        // page — that page never needed a session in the first place, and
        // a stale/expired token here shouldn't be able to yank the browser
        // back to "/" mid-navigation. Protected pages still redirect: their
        // own layout guard (and middleware, on a full load) send an
        // unauthenticated visitor to "/" regardless, so this is belt-and-
        // suspenders there, not the only thing keeping them out.
        if (typeof window !== "undefined") {
          const isOnProtectedPath = PROTECTED_PREFIXES.some((prefix) =>
            window.location.pathname.startsWith(prefix)
          );
          if (isOnProtectedPath) {
            window.location.replace("/");
          }
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
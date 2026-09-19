"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Cookies from "js-cookie";
import { useQueryClient } from "@tanstack/react-query";

import {
  registerUser,
  loginUser,
  logoutUser,
  getProfile,
} from "@/services/auth.service";
import { defaultQueryOptions } from "@/lib/queryOptions";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { PALETTE_STORAGE_KEY } from "@/lib/palettes";

const AuthContext = createContext();

// next-themes (see src/providers/ThemeProvider.tsx) is mounted with no
// custom `storageKey`, so it persists under its library default, "theme".
// Theme/palette are device UI preferences, not session state — logging out
// must not reset them.
const PRESERVED_ON_LOGOUT_KEYS = ["theme", PALETTE_STORAGE_KEY];

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
    Cookies.remove("accessToken", { path: "/" });
    Cookies.remove("refreshToken", { path: "/" });
    Cookies.remove("role", { path: "/" });

    Cookies.remove("accessToken");
    Cookies.remove("refreshToken");
    Cookies.remove("role");

    // 2. Clear all local and session storage — except device UI preferences
    // (theme/palette), which are independent of the authenticated session
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
      setIsVerified(true);
      return true;
    } catch (error) {
      console.error("Session verification failed:", error);
      logoutLocal();
      setIsVerified(true);
      return false;
    } finally {
      setIsVerifying(false);
    }
  };

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
    console.log("[AUTH] check:", { pathname, loading, isVerified, user: user ? user.role : null });
    if (!loading && isVerified && user) {
      const guestRoutes = [
        "/",
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/verify-otp"
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
        const target = returnTo || defaultDashboard;
        console.log("[REDIRECT] from:", pathname, "to:", target, "reason: authenticated user on guest route");
        router.replace(target);
      }
    }
  }, [user, loading, isVerified, pathname, router]);

  const register = async (data) => {
    return await registerUser(data);
  };

  const login = async (credentials) => {
    const response = await loginUser(credentials);
    const { accessToken, refreshToken, user } = response.data;

    const isProduction = process.env.NODE_ENV === "production";

    Cookies.set("accessToken", accessToken, {
      expires: 1,
      path: "/",
      sameSite: "strict",
      secure: isProduction,
    });

    Cookies.set("refreshToken", refreshToken, {
      expires: 7,
      path: "/",
      sameSite: "strict",
      secure: isProduction,
    });

    Cookies.set("role", user.role, {
      expires: 1,
      path: "/",
      sameSite: "strict",
      secure: isProduction,
    });

    if (typeof window !== "undefined") {
      localStorage.setItem("user", JSON.stringify(user));
      sessionStorage.setItem("fresh_login", "true");
    }

    // Seed the same cache key verifySession() reads, so the freshly-logged-in
    // user isn't immediately re-fetched via another getProfile() call.
    queryClient.setQueryData(AUTH_SESSION_KEY, { success: true, data: user });

    setUser(user);
    setIsVerified(true);
    return user;
  };

  const logout = async () => {
    try {
      const refreshToken = Cookies.get("refreshToken");
      await logoutUser(refreshToken).catch((err) => {
        console.warn("Logout API call notice:", err?.message || err);
      });
    } catch (error) {
      console.warn("Logout error handled gracefully:", error?.message || error);
    } finally {
      logoutLocal();
      if (typeof window !== "undefined") {
        // Hard navigation (not router.replace) so every provider in the tree
        // (sockets, notifications, chat, etc.) resets cleanly — and
        // .replace() so the protected page we're leaving isn't left in
        // history as the back-button target.
        window.location.replace("/");
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isVerifying,
        isVerified,
        login,
        register,
        logout,
        logoutLocal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
import Cookies from "js-cookie";

/**
 * Single writer for the session cookies.
 *
 * `middleware.js` authorizes every /admin, /instructor and /student request by
 * reading `accessToken` AND `role` — so the two have to live and die together.
 * They used to be written in two places with different lifetimes: login set all
 * three cookies, while the axios 401-refresh interceptor re-issued only
 * `accessToken` with a fresh 1-day expiry. Because backend access tokens expire
 * in minutes, that refresh rolls `accessToken` forward all day while `role`
 * quietly hits its original expiry and disappears. The app still looks signed in
 * (accessToken + cached user), but middleware sees a half-session and bounces
 * every dashboard navigation back to "/".
 *
 * Every write now goes through here so that can't drift apart again.
 */

// Matches the backend's refresh-token window; the access cookie is the shorter
// of the two and `role` deliberately rides along with it.
const ACCESS_TOKEN_DAYS = 1;
const REFRESH_TOKEN_DAYS = 7;

const baseOptions = () => ({
  path: "/",
  sameSite: "strict",
  secure: process.env.NODE_ENV === "production",
});

/**
 * Writes whichever parts of the session are supplied, leaving the rest intact.
 *
 * - login passes all three
 * - the refresh interceptor passes { accessToken, role } (there is no new
 *   refresh token to store)
 * - a confirmed session passes { role } alone to re-assert the authoritative
 *   role from the server profile
 */
export const setSessionCookies = ({ accessToken, refreshToken, role } = {}) => {
  if (accessToken) {
    Cookies.set("accessToken", accessToken, {
      ...baseOptions(),
      expires: ACCESS_TOKEN_DAYS,
    });
  }

  if (refreshToken) {
    Cookies.set("refreshToken", refreshToken, {
      ...baseOptions(),
      expires: REFRESH_TOKEN_DAYS,
    });
  }

  if (role) {
    Cookies.set("role", role, {
      ...baseOptions(),
      expires: ACCESS_TOKEN_DAYS,
    });
  }
};

export const clearSessionCookies = () => {
  // Removed both with and without an explicit path: a cookie written by an
  // older build (js-cookie's default path) and one written by the current one
  // are distinct entries to the browser, and leaving either behind is what
  // resurrects a half-session after logout.
  ["accessToken", "refreshToken", "role"].forEach((name) => {
    Cookies.remove(name, { path: "/" });
    Cookies.remove(name);
  });
};

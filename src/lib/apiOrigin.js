/**
 * Single resolver for the origin of the API / Socket.io server.
 *
 * NEXT_PUBLIC_API_URL stays the source of truth — this does not replace it.
 * What it adds is one rule, applied in one place instead of being re-derived
 * at the five call sites that used to read the env var inline (axios, the
 * socket service, blob URL display, chat attachments, the AI assistant's SSE
 * calls).
 *
 * The rule: a *loopback* API URL is relative to whoever is looking.
 *
 * NEXT_PUBLIC_API_URL is baked into the client bundle as one fixed string, but
 * "localhost" means a different machine in every browser that runs it. Opened
 * on this PC it is the API; opened on a phone over the Wi-Fi it is the phone
 * itself, and every request fails. Pinning the LAN IP into .env instead just
 * moves the problem — the address is handed out by DHCP and changes with the
 * network, and then localhost on this PC breaks.
 *
 * So when the configured URL points at loopback AND the page was served from
 * some other host, the API host is swapped for the host the page came from.
 * The port, protocol and any path are preserved.
 *
 *   page http://localhost:3000        -> http://localhost:5000     (unchanged)
 *   page http://192.168.1.105:3000    -> http://192.168.1.105:5000
 *
 * A non-loopback NEXT_PUBLIC_API_URL is always used verbatim, so a deployed
 * build pointing at a real API host is never rewritten — and pinning an
 * explicit LAN IP in .env still works if that is ever wanted.
 *
 * On the server (SSR, route handlers) there is no page host to read, so the
 * configured value is returned as-is. That is correct there: those run on this
 * PC, where localhost really is the API.
 */

// Used only when NEXT_PUBLIC_API_URL is unset. Matches the fallback that was
// previously hardcoded in ChatMessage.jsx, and is rewritten for LAN visitors
// like any other loopback value.
const DEFAULT_API_URL = "http://localhost:5000";

const stripTrailingSlash = (value) => value.replace(/\/+$/, "");

const CONFIGURED_API_URL = stripTrailingSlash(
  process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL
);

const CONFIGURED_SOCKET_URL = stripTrailingSlash(
  process.env.NEXT_PUBLIC_SOCKET_URL || ""
);

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

const resolveForCurrentHost = (configured) => {
  if (!configured) return "";

  // No window: SSR and the /api route handlers, which run on this machine.
  if (typeof window === "undefined") return configured;

  let url;
  try {
    url = new URL(configured);
  } catch {
    // Not absolute (e.g. a same-origin path) — nothing to rewrite.
    return configured;
  }

  // Explicitly configured host wins: production, or a deliberately pinned IP.
  if (!LOOPBACK_HOSTS.has(url.hostname)) return configured;

  // Being viewed on this PC — loopback is already right.
  const pageHost = window.location.hostname;
  if (!pageHost || LOOPBACK_HOSTS.has(pageHost)) return configured;

  url.hostname = pageHost;
  return stripTrailingSlash(url.toString());
};

/** Origin for REST calls and for files served from the API (e.g. /uploads). */
export const getApiOrigin = () => resolveForCurrentHost(CONFIGURED_API_URL);

/**
 * Origin for the Socket.io connection. Keeps the existing precedence —
 * NEXT_PUBLIC_SOCKET_URL when set, otherwise the API origin.
 */
export const getSocketOrigin = () =>
  resolveForCurrentHost(CONFIGURED_SOCKET_URL) || getApiOrigin();

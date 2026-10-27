/**
 * Shared checks for the Next route handlers that read or write Vercel Blob
 * with the server's Blob token (/api/blob-proxy, /api/external-file/*).
 * Server-only. No Next imports, so it can be unit-tested with plain node.
 */

const BLOB_STORE_SUFFIX = ".blob.vercel-storage.com";

/**
 * True only for https URLs on Vercel's own hosts. The previous check,
 * `hostname.endsWith("vercel.com")`, also matched attacker-registrable names
 * such as `evilvercel.com`, and these handlers send the Blob read/write token
 * to whatever host passes it.
 */
export function isAllowedBlobUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  return host.endsWith(BLOB_STORE_SUFFIX) || host === "vercel.com" || host.endsWith(".vercel.com");
}

/**
 * The signed-in caller's role, validated by the API (GET /auth/profile runs
 * the full session gate: ACTIVE, unexpired, bound device, active account), or
 * null when there is no valid session.
 *
 * @param {{ apiUrl: string, accessToken?: string, deviceKey?: string, fetchImpl?: typeof fetch }} options
 * @returns {Promise<{ role: string } | null>}
 */
export async function resolveCaller({ apiUrl, accessToken, deviceKey, fetchImpl = fetch }) {
  if (!apiUrl || !accessToken) return null;
  try {
    const response = await fetchImpl(`${apiUrl}/auth/profile`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(deviceKey ? { "X-Device-Key": deviceKey } : {}),
      },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const body = await response.json();
    const role = body?.data?.role;
    return typeof role === "string" ? { role } : null;
  } catch {
    return null;
  }
}

export const CONTENT_ACTIVE_ON_ANOTHER_DEVICE = "CONTENT_ACTIVE_ON_ANOTHER_DEVICE";

/**
 * A short memory of callers already checked, keyed by session and device.
 *
 * The file proxies check the session (and, for a student, the playback lease)
 * with the API on every request, and one page can make many — a course list
 * with several cover images, a PDF fetched in ranges. Each check is a round
 * trip to the API and its database, so they dominated load time. A successful
 * check is remembered for `ttlMs`; the cost is that a session ended, or a
 * lease taken on another device, reaches this proxy up to `ttlMs` late.
 * Only "allowed" answers are kept — a refusal or a failed check is asked again.
 *
 * @param {{ ttlMs?: number, max?: number, now?: () => number }} [options]
 */
export function createCallerCache({ ttlMs = 60_000, max = 1000, now = () => Date.now() } = {}) {
  const entries = new Map();
  return {
    get(key) {
      const entry = entries.get(key);
      if (!entry) return null;
      if (entry.expiresAt <= now()) {
        entries.delete(key);
        return null;
      }
      return entry.value;
    },
    set(key, value) {
      if (entries.size >= max) {
        // Drop expired entries first; if still full, the oldest one.
        const t = now();
        for (const [k, e] of entries) if (e.expiresAt <= t) entries.delete(k);
        if (entries.size >= max) entries.delete(entries.keys().next().value);
      }
      entries.set(key, { value, expiresAt: now() + ttlMs });
    },
    get size() {
      return entries.size;
    },
  };
}

/** The key a caller is remembered under: their session token and device. */
export const callerCacheKey = (accessToken, deviceKey) => `${accessToken || ""}\u0000${deviceKey || ""}`;

/**
 * The caller and, for a student, their content access — asked in parallel
 * (the lease check is asked before the role is known; its answer is simply
 * not used for other roles) and remembered for a short while when allowed.
 *
 * @returns {Promise<{ role: string, access: "allowed" | "blocked" | "unknown" } | null>}
 */
export async function resolveCallerWithAccess(credentials, cache) {
  const key = callerCacheKey(credentials.accessToken, credentials.deviceKey);
  const remembered = cache?.get(key);
  if (remembered) return remembered;

  const [caller, studentAccess] = await Promise.all([
    resolveCaller(credentials),
    contentAccessFor({ ...credentials, role: "STUDENT" }),
  ]);
  if (!caller) return null;

  const result = { ...caller, access: caller.role === "STUDENT" ? studentAccess : "allowed" };
  if (result.access === "allowed") cache?.set(key, result);
  return result;
}

/**
 * The API path /api/uploads-proxy may fetch: a file under /uploads/, as the
 * API serves it. Null for anything else — another API route, a path that
 * climbs out of /uploads (`..`, encoded or not), a backslash, a query or
 * fragment, a protocol-relative or absolute URL — so the proxy can never be
 * pointed at a different resource with the caller's credentials.
 */
export function normalizeUploadsPath(raw) {
  if (typeof raw !== "string" || raw.length > 1024) return null;
  let decoded = raw;
  try {
    // Fully decode, so double-encoded traversal (%252e%252e) is seen too.
    for (let i = 0; i < 3 && /%[0-9a-f]{2}/i.test(decoded); i += 1) decoded = decodeURIComponent(decoded);
  } catch {
    return null;
  }
  if (!decoded.startsWith("/uploads/")) return null;
  if (/[\\?#\0]/.test(decoded) || decoded.includes("//")) return null;
  const segments = decoded.split("/").slice(2);
  if (segments.length === 0 || segments.some((s) => s === "" || s === "." || s === "..")) return null;
  return `/uploads/${segments.map(encodeURIComponent).join("/")}`;
}

/**
 * STUDENT content-access rule for the file routes (the API enforces the same
 * rule on its content endpoints): while another device of the account holds
 * the playback lease, this device gets no course file bytes. Asks the API's
 * GET /playback/status, which answers for this session and device only.
 *
 * Fails closed: "unknown" (no answer) must be refused by the caller rather
 * than serve the file. Other roles are never limited.
 *
 * @returns {Promise<"allowed" | "blocked" | "unknown">}
 */
export async function contentAccessFor({ role, apiUrl, accessToken, deviceKey, fetchImpl = fetch }) {
  if (role !== "STUDENT") return "allowed";
  if (!apiUrl || !accessToken) return "unknown";
  try {
    const response = await fetchImpl(`${apiUrl}/playback/status`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(deviceKey ? { "X-Device-Key": deviceKey } : {}),
      },
      cache: "no-store",
    });
    if (!response.ok) return "unknown";
    const data = (await response.json())?.data;
    if (!data || typeof data.active !== "boolean") return "unknown";
    return data.active && !data.heldByThisDevice ? "blocked" : "allowed";
  } catch {
    return "unknown";
  }
}

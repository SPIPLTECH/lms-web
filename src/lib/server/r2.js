import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Cloudflare R2, where uploaded files are stored (it replaced Vercel Blob).
 * Server-only: it reads the R2_* keys.
 *
 * Every file goes in the private bucket (R2_PRIVATE_BUCKET) and reaches the
 * browser only through /api/blob-proxy, which checks the caller first. A
 * stored file's URL is its R2 address,
 * https://<account>.r2.cloudflarestorage.com/<bucket>/<key>, which refuses
 * unsigned requests; the server reads it through a short-lived signed copy.
 */

const R2_HOST_SUFFIX = ".r2.cloudflarestorage.com";
const SIGNED_URL_SECONDS = 300;

function settings() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PRIVATE_BUCKET } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_PRIVATE_BUCKET) return null;
  return {
    host: `${R2_ACCOUNT_ID.toLowerCase()}${R2_HOST_SUFFIX}`,
    bucket: R2_PRIVATE_BUCKET,
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  };
}

let client = null;
function r2Client(config) {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${config.host}`,
      // <host>/<bucket>/<key>, the same shape as stored URLs.
      forcePathStyle: true,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    });
  }
  return client;
}

function requireSettings() {
  const config = settings();
  if (!config) {
    const error = new Error("File storage is not configured on the server (R2_* settings are missing).");
    error.status = 500;
    throw error;
  }
  return config;
}

export const r2Configured = () => settings() !== null;

/** The stored URL for an object key in the private bucket. */
export function r2ObjectUrl(key) {
  const { host, bucket } = requireSettings();
  return `https://${host}/${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

/**
 * The object key when `rawUrl` is a file in this account's private bucket,
 * else null. Strict on purpose: the proxy signs whatever passes, so only our
 * own host and bucket qualify, with no credentials, port, query or `..`.
 */
export function parseR2Url(rawUrl) {
  const config = settings();
  if (!config || typeof rawUrl !== "string") return null;
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.hostname.toLowerCase() !== config.host) return null;
  if (url.username || url.password || url.port || url.search || url.hash) return null;
  const [, bucket, ...rest] = url.pathname.split("/");
  if (bucket !== config.bucket || rest.length === 0) return null;
  let segments;
  try {
    segments = rest.map(decodeURIComponent);
  } catch {
    return null;
  }
  if (segments.some((s) => s === "" || s === "." || s === "..")) return null;
  return segments.join("/");
}

/** A short-lived URL that reads `key` without credentials (Range requests work on it). */
export async function signedR2Url(key) {
  const config = requireSettings();
  return getSignedUrl(r2Client(config), new GetObjectCommand({ Bucket: config.bucket, Key: key }), {
    expiresIn: SIGNED_URL_SECONDS,
  });
}

/** Stores `body` under `key` in the private bucket and returns its stored URL. */
export async function putR2Object(key, body, contentType) {
  const config = requireSettings();
  await r2Client(config).send(
    new PutObjectCommand({ Bucket: config.bucket, Key: key, Body: body, ContentType: contentType })
  );
  return r2ObjectUrl(key);
}

/**
 * `<prefix>/<timestamp>-<safe name>-<random><ext>`: the shape Vercel Blob's
 * addRandomSuffix gave, so names stay unique and unguessable.
 */
export function uniqueR2Key(prefix, fileName) {
  const safeName = String(fileName || "file").replace(/[^a-zA-Z0-9.-]/g, "_");
  const dot = safeName.lastIndexOf(".");
  const base = dot > 0 ? safeName.slice(0, dot) : safeName;
  const ext = dot > 0 ? safeName.slice(dot) : "";
  const random = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  return `${prefix}/${Date.now()}-${base}-${random}${ext}`;
}

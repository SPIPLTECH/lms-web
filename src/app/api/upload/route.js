import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { CONTENT_ACTIVE_ON_ANOTHER_DEVICE, contentAccessFor } from "@/lib/server/sessionCaller";
import { putR2Object, r2Configured, uniqueR2Key } from "@/lib/server/r2";

const ALLOWED_ROLES = ["INSTRUCTOR", "ADMIN"];

// A STUDENT may upload exactly one kind of file: the completed PDF that IS
// their assignment submission. Everything about that path stays narrow — the
// caller must ask for this purpose explicitly, the file must really be a PDF,
// and it is written under its own prefix, never alongside instructor content.
// Instructor/admin uploads are untouched by any of this.
const STUDENT_UPLOAD_PURPOSE = "assignment-submission";
const STUDENT_UPLOAD_PREFIX = "assignment-submissions";
const STUDENT_MAX_BYTES = 20 * 1024 * 1024;

async function verifyAuth(request, { purpose } = {}) {
  const cookieStore = await cookies();
  let token = cookieStore.get("accessToken")?.value;

  if (!token && request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
  }

  if (!token) {
    throw new Error("Unauthorized: Missing authentication token");
  }

  // The API binds sessions to a device; forward this browser's device key so
  // the session check (GET /auth/profile) accepts the caller's own token.
  const deviceKey = cookieStore.get("deviceKey")?.value || request?.headers.get("x-device-key");
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/profile`, {
    headers: {
      Authorization: `Bearer ${token}`,
      ...(deviceKey ? { "X-Device-Key": deviceKey } : {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unauthorized: Invalid token session");
  }

  const { data } = await response.json();
  const role = data?.role;

  if (ALLOWED_ROLES.includes(role)) return { role };

  if (role === "STUDENT" && purpose === STUDENT_UPLOAD_PURPOSE) {
    // A submission is a course-content action: not while another device of
    // the account holds the playback lease (the API refuses the submit too).
    const access = await contentAccessFor({ role, apiUrl: process.env.NEXT_PUBLIC_API_URL, accessToken: token, deviceKey });
    if (access !== "allowed") {
      const refusal = new Error(
        access === "blocked"
          ? "This account is currently active on another device. Stop playback on that device to access course content here."
          : "Could not confirm access. Please try again."
      );
      refusal.status = access === "blocked" ? 409 : 503;
      refusal.code = access === "blocked" ? CONTENT_ACTIVE_ON_ANOTHER_DEVICE : undefined;
      throw refusal;
    }
    return { role };
  }

  throw new Error("Unauthorized: Role not permitted to upload files");
}

const ALLOWED_INSTRUCTOR_EXTENSIONS = new Set([
  ".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xlsx", ".zip",
  ".csv", ".tsv", ".txt", ".md", ".json",
  ".jpg", ".jpeg", ".png", ".webp", ".gif",
  ".mp4", ".webm", ".mov", ".mp3", ".wav", ".ogg", ".m4a",
]);

const FORBIDDEN_UPLOAD_MIMES = new Set([
  "image/svg+xml",
  "text/html",
  "application/xhtml+xml",
  "text/xml",
  "application/xml",
  "application/javascript",
  "text/javascript",
  "application/x-shockwave-flash",
  "application/x-msdownload",
]);

function getLowerExtension(name) {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx).toLowerCase() : "";
}

function badUpload(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

async function assertValidUploadSignature(file, ext) {
  const slice = file.slice(0, Math.min(file.size || 0, 4096));
  const bytes = new Uint8Array(await slice.arrayBuffer());
  if (bytes.length === 0) {
    throw badUpload("Uploaded file is empty");
  }
  const startsWith = (...seq) => bytes.length >= seq.length && seq.every((b, i) => bytes[i] === b);

  if (ext === ".pdf" && !startsWith(0x25, 0x50, 0x44, 0x46, 0x2d)) {
    throw badUpload("File content does not match PDF signature");
  }
  if (ext === ".png" && !startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) {
    throw badUpload("File content does not match PNG signature");
  }
  if ((ext === ".jpg" || ext === ".jpeg") && !startsWith(0xff, 0xd8, 0xff)) {
    throw badUpload("File content does not match JPEG signature");
  }
  if (ext === ".gif" && !startsWith(0x47, 0x49, 0x46, 0x38)) {
    throw badUpload("File content does not match GIF signature");
  }
  if (
    ext === ".webp" &&
    !(bytes.length >= 12 && startsWith(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50)
  ) {
    throw badUpload("File content does not match WebP signature");
  }
  if (
    (ext === ".zip" || ext === ".docx" || ext === ".pptx" || ext === ".xlsx") &&
    !startsWith(0x50, 0x4b, 0x03, 0x04) &&
    !startsWith(0x50, 0x4b, 0x05, 0x06)
  ) {
    throw badUpload(`File content does not match ${ext.toUpperCase()} archive signature`);
  }
  if ((ext === ".doc" || ext === ".ppt") && !startsWith(0xd0, 0xcf, 0x11, 0xe0)) {
    throw badUpload(`File content does not match ${ext.toUpperCase()} document signature`);
  }
  if ([".txt", ".csv", ".tsv", ".md", ".json"].includes(ext)) {
    if (startsWith(0x4d, 0x5a) || startsWith(0x7f, 0x45, 0x4c, 0x46) || bytes.includes(0x00)) {
      throw badUpload("Binary content is not permitted inside a text upload");
    }
    const head = new TextDecoder("utf-8").decode(bytes).replace(/^\uFEFF/, "").trimStart().slice(0, 256).toLowerCase();
    if (head.startsWith("<!doctype html") || head.startsWith("<html") || head.startsWith("<svg") || head.startsWith("<script") || head.includes("<svg")) {
      throw badUpload("Active HTML/SVG markup is not permitted in uploads");
    }
  }
}

/** A student submission must genuinely be a PDF, by declared type, extension, and %PDF- signature. */
async function assertStudentPdf(file) {
  const name = typeof file.name === "string" ? file.name : "";
  const type = typeof file.type === "string" ? file.type : "";

  if (type !== "application/pdf" || !/\.pdf$/i.test(name)) {
    throw badUpload("Only PDF files can be submitted for an assignment");
  }
  if (typeof file.size === "number" && file.size > STUDENT_MAX_BYTES) {
    throw badUpload("The submitted PDF must be 20MB or smaller");
  }
  await assertValidUploadSignature(file, ".pdf");
}

async function assertInstructorUploadAllowed(file) {
  const name = typeof file.name === "string" ? file.name : "";
  const mime = (typeof file.type === "string" ? file.type : "").split(";")[0].trim().toLowerCase();
  const ext = getLowerExtension(name);
  if (!ALLOWED_INSTRUCTOR_EXTENSIONS.has(ext) || FORBIDDEN_UPLOAD_MIMES.has(mime)) {
    throw badUpload(`File type ${ext || mime || "unknown"} is not permitted for upload`);
  }
  await assertValidUploadSignature(file, ext);
}

export async function POST(request) {
  try {
    // 1. Extract the file first — the role check depends on what is being
    //    uploaded, since a STUDENT is only permitted the submission path.
    const formData = await request.formData();
    const file = formData.get("file");
    const purpose = formData.get("purpose");

    // 2. Verify Auth & Role
    const { role } = await verifyAuth(request, { purpose });

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "No file provided for upload" },
        { status: 400 }
      );
    }

    const isStudentSubmission = role === "STUDENT";
    if (isStudentSubmission) {
      await assertStudentPdf(file);
    } else {
      await assertInstructorUploadAllowed(file);
    }

    // 3. Verify the server's R2 settings
    if (!r2Configured()) {
      console.error("R2_* settings are missing in server environment");
      return NextResponse.json(
        { error: "File storage (R2) is not configured on the server." },
        { status: 500 }
      );
    }

    // 4. Put the file into R2's private bucket. Every upload is private: it
    // reaches the browser only through /api/blob-proxy (which checks the
    // caller) or, for video and audio, the API's lease-gated playback route.
    const prefix = isStudentSubmission ? STUDENT_UPLOAD_PREFIX : "content-uploads";
    const pathname = uniqueR2Key(prefix, file.name);
    const contentType = typeof file.type === "string" && file.type ? file.type : "application/octet-stream";
    const url = await putR2Object(pathname, Buffer.from(await file.arrayBuffer()), contentType);

    return NextResponse.json({
      url,
      fileUrl: url,
      pathname,
      contentType,
      originalName: file.name,
      size: file.size,
    });
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to upload file",
        ...(error?.code ? { code: error.code } : {}),
      },
      { status: error?.status || 400 }
    );
  }
}

import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { CONTENT_ACTIVE_ON_ANOTHER_DEVICE, contentAccessFor } from "@/lib/server/sessionCaller";

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

/** A student submission must genuinely be a PDF, by both declared type and extension. */
function assertStudentPdf(file) {
  const name = typeof file.name === "string" ? file.name : "";
  const type = typeof file.type === "string" ? file.type : "";

  if (type !== "application/pdf" || !/\.pdf$/i.test(name)) {
    throw new Error("Only PDF files can be submitted for an assignment");
  }
  if (typeof file.size === "number" && file.size > STUDENT_MAX_BYTES) {
    throw new Error("The submitted PDF must be 20MB or smaller");
  }
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
      assertStudentPdf(file);
    }

    // 3. Verify Server Secret Token for Vercel Blob
    const blobToken = process.env.VERCEL_BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN;

    if (!blobToken) {
      console.error("BLOB_READ_WRITE_TOKEN is missing in server environment");
      return NextResponse.json(
        { error: "Vercel Blob store token (BLOB_READ_WRITE_TOKEN) is not configured on the server." },
        { status: 500 }
      );
    }

    // 4. Put file into Vercel Blob Store (supports both public and private stores)
    //
    // Video and audio are written private when the store allows it: a private
    // blob is only readable through the API's lease-gated playback route (or
    // the authenticated proxy, for instructors), whereas a public blob's URL
    // plays for anyone who has it. Everything else stays public first, as
    // before — course thumbnails, for one, are shown to signed-out visitors.
    // A store fixed to the other access mode falls back to it.
    const prefix = isStudentSubmission ? STUDENT_UPLOAD_PREFIX : "content-uploads";
    const pathname = `${prefix}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const isMedia = /^(video|audio)\//i.test(typeof file.type === "string" ? file.type : "");
    const accessOrder = isMedia ? ["private", "public"] : ["public", "private"];

    let blob;
    let lastError;
    for (const access of accessOrder) {
      try {
        blob = await put(pathname, file, {
          access,
          token: blobToken,
          addRandomSuffix: true,
        });
        if (isMedia && access === "public") {
          console.warn("Vercel Blob store does not accept private blobs; this media upload is public.");
        }
        break;
      } catch (putErr) {
        lastError = putErr;
        const msg = putErr instanceof Error ? putErr.message : String(putErr);
        // Only a store/access-mode mismatch is worth trying the other mode.
        if (!/private|public|access/i.test(msg)) throw putErr;
      }
    }
    if (!blob) throw lastError;

    return NextResponse.json({
      url: blob.url,
      fileUrl: blob.url,
      pathname: blob.pathname,
      contentType: blob.contentType,
      originalName: file.name,
      size: file.size,
    });
  } catch (error) {
    console.error("Vercel Blob upload error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to upload file to Vercel Blob",
        ...(error?.code ? { code: error.code } : {}),
      },
      { status: error?.status || 400 }
    );
  }
}

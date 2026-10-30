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

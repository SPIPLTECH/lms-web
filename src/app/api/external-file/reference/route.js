import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { resolveExternalFile } from "@/lib/external/resolveExternalFile";
import { resolveCaller } from "@/lib/server/sessionCaller";
import { putR2Object } from "@/lib/server/r2";

export const dynamic = "force-dynamic";

// Writing to file storage is an authoring action. It used to accept anyone.
const WRITER_ROLES = new Set(["INSTRUCTOR", "ADMIN"]);

/**
 * API route to store external document URL reference metadata in R2.
 *
 * NOTE:
 * - NO external file downloading occurs.
 * - NO document bytes (PDF/DOC/PPT) are fetched or stored.
 * - Stores ONLY a small JSON metadata object containing classification & viewer resolution.
 *
 * POST /api/external-file/reference
 * Body: { "url": "https://drive.google.com/file/d/ABC123/view" }
 */
export async function POST(request) {
  try {
    const store = await cookies();
    const caller = await resolveCaller({
      apiUrl: process.env.NEXT_PUBLIC_API_URL,
      accessToken: store.get("accessToken")?.value || request.headers.get("authorization")?.replace(/^Bearer /, ""),
      deviceKey: store.get("deviceKey")?.value || request.headers.get("x-device-key") || undefined,
    });
    if (!caller) {
      return NextResponse.json({ error: "Sign in to save a document link." }, { status: 401 });
    }
    if (!WRITER_ROLES.has(caller.role)) {
      return NextResponse.json({ error: "Only instructors and admins can save document links." }, { status: 403 });
    }

    const body = await request.json();
    const { url } = body || {};

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Invalid request: 'url' parameter must be a non-empty string." },
        { status: 400 }
      );
    }

    const trimmedUrl = url.trim();

    // 1. Resolve External URL Metadata (using Step 1 & Step 2 resolution)
    const resolved = resolveExternalFile(trimmedUrl);

    if (!resolved || !resolved.isValid) {
      return NextResponse.json(
        { error: "Invalid URL or unsupported protocol. Only HTTP and HTTPS URLs are accepted." },
        { status: 400 }
      );
    }

    // 2. Build Small JSON Metadata Object (NO BINARY FILE BYTES)
    const metadata = {
      version: 1,
      sourceType: "EXTERNAL_URL",
      provider: resolved.provider,
      fileType: resolved.fileType,
      sourceUrl: resolved.sourceUrl,
      viewerUrl: resolved.viewerUrl,
      fileId: resolved.fileId,
      createdAt: new Date().toISOString(),
    };

    const metadataJson = JSON.stringify(metadata, null, 2);

    // 3. Store metadata JSON in R2's private bucket
    const uniqueId = `ext_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const pathname = `external-references/${uniqueId}.json`;
    const referenceUrl = await putR2Object(pathname, metadataJson, "application/json");

    return NextResponse.json({
      success: true,
      referenceUrl,
      provider: resolved.provider,
      fileType: resolved.fileType,
      metadata: metadata,
    });
  } catch (error) {
    console.error("[EXTERNAL REFERENCE API ERROR]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to store external reference" },
      { status: 500 }
    );
  }
}

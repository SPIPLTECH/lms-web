import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { get } from "@vercel/blob";

import {
  CONTENT_ACTIVE_ON_ANOTHER_DEVICE,
  contentAccessFor,
  isAllowedBlobUrl,
  resolveCaller,
} from "@/lib/server/sessionCaller";

export const dynamic = "force-dynamic";

/**
 * Server-side API route to retrieve stored external document URL reference metadata.
 *
 * GET /api/external-file/reference/[id]?url=<blob-reference-url>
 *
 * Security:
 * - Signed-in users only (any role: the document viewer is shared by
 *   instructors and students). It used to answer anyone.
 * - Target must be an https URL on Vercel's own hosts and a JSON reference.
 *   The fallback fetch sends the Blob read/write token to that host, so the
 *   old `endsWith("vercel.com")` check — which `evilvercel.com` passed — let a
 *   caller exfiltrate the token.
 * - Never returns Blob read/write tokens or internal secrets to the client.
 */
export async function GET(request, { params }) {
  try {
    const store = await cookies();
    const credentials = {
      apiUrl: process.env.NEXT_PUBLIC_API_URL,
      accessToken: store.get("accessToken")?.value,
      deviceKey: store.get("deviceKey")?.value,
    };
    const caller = await resolveCaller(credentials);
    if (!caller) {
      return NextResponse.json({ error: "Sign in to view this document." }, { status: 401 });
    }
    // STUDENT only: no course documents while another device is playing.
    const access = await contentAccessFor({ ...credentials, role: caller.role });
    if (access === "blocked") {
      return NextResponse.json(
        {
          error: "This account is currently active on another device. Stop playback on that device to access course content here.",
          code: CONTENT_ACTIVE_ON_ANOTHER_DEVICE,
        },
        { status: 409 }
      );
    }
    if (access === "unknown") {
      return NextResponse.json({ error: "Could not confirm access to this document. Please try again." }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const resolvedParams = await params;
    const refId = resolvedParams?.id;
    let referenceUrl = searchParams.get("url");

    if (!referenceUrl && refId) {
      // If full reference URL wasn't provided in query param, construct default pathname search
      if (refId.startsWith("http://") || refId.startsWith("https://")) {
        referenceUrl = refId;
      }
    }

    if (!referenceUrl) {
      return NextResponse.json(
        { error: "Missing required reference URL parameter." },
        { status: 400 }
      );
    }

    // SSRF & Domain Validation: Target must be a Vercel Blob JSON metadata reference
    let parsedUrl;
    try {
      parsedUrl = new URL(referenceUrl);
    } catch {
      return NextResponse.json({ error: "Invalid reference URL format." }, { status: 400 });
    }

    const isVercelBlobDomain = isAllowedBlobUrl(referenceUrl);

    const isJsonReference =
      parsedUrl.pathname.includes("external-references/") ||
      parsedUrl.pathname.endsWith(".json");

    if (!isVercelBlobDomain || !isJsonReference) {
      return NextResponse.json(
        { error: "Forbidden: Target URL is not a valid external reference JSON object." },
        { status: 400 }
      );
    }

    const blobToken =
      process.env.VERCEL_BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN;

    // 1. Try SDK get() for private access
    let metadataJson = null;
    if (blobToken) {
      try {
        const blobResult = await get(referenceUrl, {
          access: "private",
          token: blobToken,
        });

        if (blobResult && blobResult.stream) {
          const text = await new Response(blobResult.stream).text();
          metadataJson = JSON.parse(text);
        }
      } catch (sdkErr) {
        console.warn("[EXTERNAL REF API] SDK get() note:", sdkErr?.message || sdkErr);
      }
    }

    // 2. Direct authenticated fetch fallback
    if (!metadataJson) {
      const headers = blobToken ? { Authorization: `Bearer ${blobToken}` } : {};
      const res = await fetch(referenceUrl, { headers, cache: "no-store" });
      if (res.ok) {
        metadataJson = await res.json();
      }
    }

    if (!metadataJson || metadataJson.sourceType !== "EXTERNAL_URL") {
      return NextResponse.json(
        { error: "Failed to retrieve valid external reference metadata." },
        { status: 404 }
      );
    }

    // Return safe metadata JSON to frontend
    return NextResponse.json({
      success: true,
      metadata: {
        version: metadataJson.version || 1,
        sourceType: "EXTERNAL_URL",
        provider: metadataJson.provider || "UNKNOWN",
        fileType: metadataJson.fileType || "UNKNOWN",
        sourceUrl: metadataJson.sourceUrl || "",
        viewerUrl: metadataJson.viewerUrl || "",
        fileId: metadataJson.fileId || null,
        createdAt: metadataJson.createdAt || null,
      },
    });
  } catch (error) {
    console.error("[EXTERNAL REF RETRIEVAL API ERROR]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to retrieve external reference" },
      { status: 500 }
    );
  }
}

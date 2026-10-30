import { classifyExternalFile } from "./classifyExternalFile.js";

/**
 * Resolves an external document URL into a normalized viewer object
 * containing provider metadata, file type, source URL, and embedded viewer URL.
 *
 * Supported Provider Resolutions:
 * - GOOGLE_DRIVE: Resolves drive.google.com & docs.google.com URLs to their /preview form.
 * - DIRECT_URL: Preserves original URL as viewer URL for direct file links (PDF/DOC/DOCX/PPT/PPTX).
 * - UNKNOWN: Safe fallback for invalid or unparseable URLs.
 *
 * @param {string} inputUrl
 * @returns {{
 *   isValid: boolean,
 *   provider: "GOOGLE_DRIVE" | "DIRECT_URL" | "UNKNOWN",
 *   fileType: "PDF" | "DOC" | "DOCX" | "PPT" | "PPTX" | "UNSUPPORTED" | "UNKNOWN",
 *   sourceUrl: string,
 *   viewerUrl: string,
 *   fileId: string | null
 * }}
 */
export function resolveExternalFile(inputUrl) {
  const classification = classifyExternalFile(inputUrl);

  if (!classification || !classification.isValid) {
    return {
      isValid: false,
      provider: "UNKNOWN",
      fileType: "UNKNOWN",
      sourceUrl: typeof inputUrl === "string" ? inputUrl.trim() : "",
      viewerUrl: "",
      fileId: null,
    };
  }

  // 1. Google Drive / Google Docs Resolution
  if (classification.provider === "GOOGLE_DRIVE") {
    const fileId = classification.fileId;
    let viewerUrl = classification.url;

    if (fileId) {
      try {
        const parsed = new URL(classification.url);
        const pathname = parsed.pathname.toLowerCase();

        if (pathname.includes("/document/d/")) {
          viewerUrl = `https://docs.google.com/document/d/${fileId}/preview`;
        } else if (pathname.includes("/presentation/d/")) {
          viewerUrl = `https://docs.google.com/presentation/d/${fileId}/preview`;
        } else if (pathname.includes("/spreadsheets/d/")) {
          viewerUrl = `https://docs.google.com/spreadsheets/d/${fileId}/preview`;
        } else {
          // Default Google Drive file preview format
          viewerUrl = `https://drive.google.com/file/d/${fileId}/preview`;
        }
      } catch {
        viewerUrl = `https://drive.google.com/file/d/${fileId}/preview`;
      }
    }

    return {
      isValid: true,
      provider: "GOOGLE_DRIVE",
      fileType: classification.fileType || "UNKNOWN",
      sourceUrl: classification.url,
      viewerUrl: viewerUrl,
      fileId: fileId,
    };
  }

  // 2. Direct File URL Resolution (PDF, DOC, DOCX, PPT, PPTX, UNSUPPORTED)
  if (classification.provider === "DIRECT_URL") {
    return {
      isValid: true,
      provider: "DIRECT_URL",
      fileType: classification.fileType,
      sourceUrl: classification.url,
      viewerUrl: classification.url,
      fileId: null,
    };
  }

  // Fallback for unexpected cases
  return {
    isValid: false,
    provider: "UNKNOWN",
    fileType: "UNKNOWN",
    sourceUrl: classification.url || "",
    viewerUrl: "",
    fileId: null,
  };
}


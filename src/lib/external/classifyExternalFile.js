/**
 * Pure utility to classify external document URLs by provider and file type.
 *
 * Supported Providers:
 * - GOOGLE_DRIVE
 * - DIRECT_URL
 * - UNKNOWN
 *
 * Supported File Types:
 * - PDF
 * - DOC
 * - DOCX
 * - PPT
 * - PPTX
 * - UNSUPPORTED
 * - UNKNOWN
 */

const SUPPORTED_EXTENSIONS = {
  pdf: "PDF",
  doc: "DOC",
  docx: "DOCX",
  ppt: "PPT",
  pptx: "PPTX",
};

/**
 * Extracts a Google Drive file ID from various Google Drive/Docs URL formats.
 * E.g.:
 * - https://drive.google.com/file/d/FILE_ID/view
 * - https://drive.google.com/open?id=FILE_ID
 * - https://drive.google.com/uc?id=FILE_ID
 * - https://docs.google.com/document/d/FILE_ID/edit
 *
 * @param {URL} parsedUrl
 * @returns {string|null}
 */
function extractGoogleDriveFileId(parsedUrl) {
  try {
    // Format: /file/d/FILE_ID/... or /document/d/FILE_ID/... or /presentation/d/FILE_ID/...
    const pathSegments = parsedUrl.pathname.split("/").filter(Boolean);
    const dIndex = pathSegments.indexOf("d");
    if (dIndex !== -1 && pathSegments[dIndex + 1]) {
      return pathSegments[dIndex + 1];
    }

    // Format: ?id=FILE_ID
    const idParam = parsedUrl.searchParams.get("id");
    if (idParam) {
      return idParam;
    }
  } catch {
    // Fail safely
  }
  return null;
}

/**
 * Classifies an external URL.
 *
 * @param {string} inputUrl
 * @returns {{
 *   isValid: boolean,
 *   provider: "GOOGLE_DRIVE" | "DIRECT_URL" | "UNKNOWN",
 *   fileType: "PDF" | "DOC" | "DOCX" | "PPT" | "PPTX" | "UNSUPPORTED" | "UNKNOWN",
 *   url: string,
 *   fileId: string | null
 * }}
 */
export function classifyExternalFile(inputUrl) {
  if (!inputUrl || typeof inputUrl !== "string") {
    return {
      isValid: false,
      provider: "UNKNOWN",
      fileType: "UNKNOWN",
      url: "",
      fileId: null,
    };
  }

  const trimmedUrl = inputUrl.trim();
  if (!trimmedUrl) {
    return {
      isValid: false,
      provider: "UNKNOWN",
      fileType: "UNKNOWN",
      url: "",
      fileId: null,
    };
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(trimmedUrl);
  } catch {
    return {
      isValid: false,
      provider: "UNKNOWN",
      fileType: "UNKNOWN",
      url: trimmedUrl,
      fileId: null,
    };
  }

  // Ensure protocol is HTTP or HTTPS
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return {
      isValid: false,
      provider: "UNKNOWN",
      fileType: "UNKNOWN",
      url: trimmedUrl,
      fileId: null,
    };
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // 1. Google Drive Detection
  if (hostname === "drive.google.com" || hostname === "docs.google.com") {
    const fileId = extractGoogleDriveFileId(parsedUrl);
    return {
      isValid: true,
      provider: "GOOGLE_DRIVE",
      fileType: "UNKNOWN", // Drive URLs do not specify actual file extension in URL
      url: trimmedUrl,
      fileId: fileId,
    };
  }

  // 2. Direct URL Detection
  const pathname = parsedUrl.pathname;
  const lastDotIndex = pathname.lastIndexOf(".");
  
  let detectedType = "UNSUPPORTED";
  if (lastDotIndex !== -1 && lastDotIndex < pathname.length - 1) {
    const rawExt = pathname.substring(lastDotIndex + 1).toLowerCase();
    if (SUPPORTED_EXTENSIONS[rawExt]) {
      detectedType = SUPPORTED_EXTENSIONS[rawExt];
    }
  }

  return {
    isValid: true,
    provider: "DIRECT_URL",
    fileType: detectedType,
    url: trimmedUrl,
    fileId: null,
  };
}


import { resolveExternalFile } from "../resolveExternalFile.js";

/**
 * Creates an external reference JSON metadata object from a URL input.
 * Simulates server-side metadata preparation for R2 reference storage.
 *
 * @param {string} url
 * @returns {object|null}
 */
function createExternalReferenceMetadata(url) {
  if (!url || typeof url !== "string") return null;

  const resolved = resolveExternalFile(url.trim());
  if (!resolved || !resolved.isValid) return null;

  return {
    version: 1,
    sourceType: "EXTERNAL_URL",
    provider: resolved.provider,
    fileType: resolved.fileType,
    sourceUrl: resolved.sourceUrl,
    viewerUrl: resolved.viewerUrl,
    fileId: resolved.fileId,
    createdAt: new Date().toISOString(),
  };
}

function runTests() {
  const testCases = [
    {
      name: "Google Drive File Metadata",
      input: "https://drive.google.com/file/d/ABC123/view",
      expected: {
        version: 1,
        sourceType: "EXTERNAL_URL",
        provider: "GOOGLE_DRIVE",
        fileType: "UNKNOWN",
        sourceUrl: "https://drive.google.com/file/d/ABC123/view",
        viewerUrl: "https://drive.google.com/file/d/ABC123/preview",
        fileId: "ABC123",
      },
    },
    {
      name: "Google Docs Metadata",
      input: "https://docs.google.com/document/d/ABC123/edit",
      expected: {
        version: 1,
        sourceType: "EXTERNAL_URL",
        provider: "GOOGLE_DRIVE",
        fileType: "UNKNOWN",
        sourceUrl: "https://docs.google.com/document/d/ABC123/edit",
        viewerUrl: "https://docs.google.com/document/d/ABC123/preview",
        fileId: "ABC123",
      },
    },
    {
      name: "Google Slides Metadata",
      input: "https://docs.google.com/presentation/d/ABC123/edit",
      expected: {
        version: 1,
        sourceType: "EXTERNAL_URL",
        provider: "GOOGLE_DRIVE",
        fileType: "UNKNOWN",
        sourceUrl: "https://docs.google.com/presentation/d/ABC123/edit",
        viewerUrl: "https://docs.google.com/presentation/d/ABC123/preview",
        fileId: "ABC123",
      },
    },
    {
      name: "Direct PDF Metadata",
      input: "https://example.com/course.pdf",
      expected: {
        version: 1,
        sourceType: "EXTERNAL_URL",
        provider: "DIRECT_URL",
        fileType: "PDF",
        sourceUrl: "https://example.com/course.pdf",
        viewerUrl: "https://example.com/course.pdf",
        fileId: null,
      },
    },
    {
      name: "Direct DOCX Metadata",
      input: "https://example.com/course.docx",
      expected: {
        version: 1,
        sourceType: "EXTERNAL_URL",
        provider: "DIRECT_URL",
        fileType: "DOCX",
        sourceUrl: "https://example.com/course.docx",
        viewerUrl: "https://example.com/course.docx",
        fileId: null,
      },
    },
    {
      name: "Direct PPTX Metadata",
      input: "https://example.com/course.pptx",
      expected: {
        version: 1,
        sourceType: "EXTERNAL_URL",
        provider: "DIRECT_URL",
        fileType: "PPTX",
        sourceUrl: "https://example.com/course.pptx",
        viewerUrl: "https://example.com/course.pptx",
        fileId: null,
      },
    },
    {
      name: "Invalid URL Validation Safeguard",
      input: "javascript:alert(1)",
      expected: null,
    },
    {
      name: "Malformed Input Safeguard",
      input: "not-a-valid-url",
      expected: null,
    },
  ];

  let passed = 0;
  let failed = 0;

  console.log("=== RUNNING STORE EXTERNAL REFERENCE TESTS ===");

  testCases.forEach((tc) => {
    const metadata = createExternalReferenceMetadata(tc.input);

    if (tc.expected === null) {
      if (metadata === null) {
        console.log(`[PASS] ${tc.name}`);
        passed++;
      } else {
        console.error(`[FAIL] ${tc.name} — Expected null metadata but received object`);
        failed++;
      }
      return;
    }

    const jsonString = JSON.stringify(metadata);
    const isSmallJson = jsonString.length < 1000;
    const isPureJson = !jsonString.includes("PDF-1.") && !jsonString.includes("PK\x03\x04");

    const matches =
      metadata &&
      metadata.version === tc.expected.version &&
      metadata.sourceType === tc.expected.sourceType &&
      metadata.provider === tc.expected.provider &&
      metadata.fileType === tc.expected.fileType &&
      metadata.sourceUrl === tc.expected.sourceUrl &&
      metadata.viewerUrl === tc.expected.viewerUrl &&
      metadata.fileId === tc.expected.fileId &&
      isSmallJson &&
      isPureJson;

    if (matches) {
      console.log(`[PASS] ${tc.name} (${jsonString.length} bytes metadata JSON)`);
      passed++;
    } else {
      console.error(`[FAIL] ${tc.name}`);
      console.error("  Expected:", tc.expected);
      console.error("  Actual:  ", metadata);
      failed++;
    }
  });

  console.log(`\nRESULTS: ${passed} Passed, ${failed} Failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

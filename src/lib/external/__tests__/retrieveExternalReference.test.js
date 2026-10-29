import { resolveExternalFile } from "../resolveExternalFile.js";

/**
 * Step 4 Unit Test Suite: External Reference Retrieval & Native Viewer Strategy Selection.
 *
 * Verifies:
 * A. Uploaded PDF -> Preserved existing PdfViewer flow
 * B. External Direct PDF -> Native PdfViewer
 * C. Google Drive File -> Google Drive preview iframe
 * D. Google Docs Document -> Google Docs preview iframe
 * E. Google Slides Presentation -> Google Slides preview iframe
 * F. Direct DOC / DOCX -> Format preserved (NO PDF conversion), Office embed or clean fallback
 * G. Direct PPT / PPTX -> Format preserved (NO PDF conversion), Office embed or clean fallback
 * H. Invalid Reference -> Safe error state
 * I. Missing Reference -> Safe error state
 */

function selectViewerStrategy(fileUrl, metadata = null) {
  if (!fileUrl || typeof fileUrl !== "string") {
    return { strategy: "ERROR_STATE", message: "No Document URL Provided" };
  }

  // A. Uploaded (R2) PDF -> Existing PdfViewer + proxy flow
  if (fileUrl.includes(".r2.cloudflarestorage.com/") && fileUrl.endsWith(".pdf")) {
    return { strategy: "EXISTING_BLOB_PDF_VIEWER", url: fileUrl };
  }

  // Resolve URL / Stored Reference Metadata
  const resolved = metadata || resolveExternalFile(fileUrl);
  if (!resolved || !resolved.isValid) {
    return { strategy: "ERROR_STATE", message: "Unable to load document" };
  }

  // B. Direct PDF
  if (resolved.provider === "DIRECT_URL" && resolved.fileType === "PDF") {
    return { strategy: "NATIVE_PDF_VIEWER", viewerUrl: resolved.viewerUrl };
  }

  // C, D, E. Google Drive / Docs / Slides
  if (resolved.provider === "GOOGLE_DRIVE" && resolved.viewerUrl) {
    const isDocs = resolved.viewerUrl.includes("docs.google.com/document");
    const isSlides = resolved.viewerUrl.includes("docs.google.com/presentation");
    
    let subType = "GOOGLE_DRIVE_PREVIEW";
    if (isDocs) subType = "GOOGLE_DOCS_PREVIEW";
    if (isSlides) subType = "GOOGLE_SLIDES_PREVIEW";

    return { strategy: subType, viewerUrl: resolved.viewerUrl, fileId: resolved.fileId };
  }

  // F, G. Direct DOC / DOCX or PPT / PPTX
  const isDocOrPpt =
    resolved.fileType === "DOC" ||
    resolved.fileType === "DOCX" ||
    resolved.fileType === "PPT" ||
    resolved.fileType === "PPTX";

  if (resolved.provider === "DIRECT_URL" && isDocOrPpt) {
    const isLocal = fileUrl.includes("localhost") || fileUrl.includes("127.0.0.1");
    if (!isLocal) {
      return {
        strategy: "OFFICE_EMBED_VIEWER",
        fileType: resolved.fileType,
        viewerUrl: `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(resolved.viewerUrl)}`,
      };
    }
    return {
      strategy: "PREVIEW_UNAVAILABLE_FALLBACK",
      fileType: resolved.fileType,
      sourceUrl: resolved.sourceUrl,
    };
  }

  return { strategy: "PREVIEW_UNAVAILABLE_FALLBACK", fileType: resolved.fileType, sourceUrl: resolved.sourceUrl };
}

function runTests() {
  const testCases = [
    {
      name: "A. Existing Uploaded (R2) PDF Flow",
      input: "https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com/lms-private/content-uploads/sample.pdf",
      expectedStrategy: "EXISTING_BLOB_PDF_VIEWER",
    },
    {
      name: "B. External Direct PDF",
      input: "https://example.com/course.pdf",
      expectedStrategy: "NATIVE_PDF_VIEWER",
    },
    {
      name: "C. Google Drive File Preview",
      input: "https://drive.google.com/file/d/ABC123/view",
      expectedStrategy: "GOOGLE_DRIVE_PREVIEW",
      expectedViewerUrl: "https://drive.google.com/file/d/ABC123/preview",
    },
    {
      name: "D. Google Docs Preview",
      input: "https://docs.google.com/document/d/ABC123/edit",
      expectedStrategy: "GOOGLE_DOCS_PREVIEW",
      expectedViewerUrl: "https://docs.google.com/document/d/ABC123/preview",
    },
    {
      name: "E. Google Slides Preview",
      input: "https://docs.google.com/presentation/d/ABC123/edit",
      expectedStrategy: "GOOGLE_SLIDES_PREVIEW",
      expectedViewerUrl: "https://docs.google.com/presentation/d/ABC123/preview",
    },
    {
      name: "F. Direct DOCX (Format Preserved, No PDF Conversion)",
      input: "https://example.com/course.docx",
      expectedStrategy: "OFFICE_EMBED_VIEWER",
      expectedFileType: "DOCX",
    },
    {
      name: "G. Direct PPTX (Format Preserved, No PDF Conversion)",
      input: "https://example.com/course.pptx",
      expectedStrategy: "OFFICE_EMBED_VIEWER",
      expectedFileType: "PPTX",
    },
    {
      name: "H. Local DOCX (Preview Unavailable Fallback)",
      input: "http://localhost:3000/files/course.docx",
      expectedStrategy: "PREVIEW_UNAVAILABLE_FALLBACK",
      expectedFileType: "DOCX",
    },
    {
      name: "I. Invalid Reference URL",
      input: "not-a-valid-url",
      expectedStrategy: "ERROR_STATE",
    },
    {
      name: "J. Null Reference URL Input",
      input: null,
      expectedStrategy: "ERROR_STATE",
    },
  ];

  let passed = 0;
  let failed = 0;

  console.log("=== RUNNING RETRIEVE EXTERNAL REFERENCE TESTS ===");

  testCases.forEach((tc) => {
    const result = selectViewerStrategy(tc.input);

    const matchesStrategy = result.strategy === tc.expectedStrategy;
    const matchesUrl = tc.expectedViewerUrl ? result.viewerUrl === tc.expectedViewerUrl : true;
    const matchesFileType = tc.expectedFileType ? result.fileType === tc.expectedFileType : true;

    // Confirm NO format conversion to PDF occurred for DOCX / PPTX
    const noPdfConversion =
      tc.expectedFileType && tc.expectedFileType !== "PDF"
        ? result.fileType === tc.expectedFileType
        : true;

    if (matchesStrategy && matchesUrl && matchesFileType && noPdfConversion) {
      console.log(`[PASS] ${tc.name} -> Strategy: ${result.strategy}`);
      passed++;
    } else {
      console.error(`[FAIL] ${tc.name}`);
      console.error("  Expected Strategy:", tc.expectedStrategy);
      console.error("  Actual Result:    ", result);
      failed++;
    }
  });

  console.log(`\nRESULTS: ${passed} Passed, ${failed} Failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

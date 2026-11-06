"use client";

import { useState } from "react";
import { Award, Download, Printer, X, Loader2 } from "lucide-react";
import { downloadCertificatePdf, buildCertificateFilename } from "@/services/certificate.service";
import CertificatePreviewCanvas from "@/components/student/certificates/CertificatePreviewCanvas";

export default function CertificateViewerModal({ cert, onClose }) {
  const [downloading, setDownloading] = useState(false);

  if (!cert) return null;

  const rawTemplate =
    cert.templateId ||
    cert.course?.certificateTemplate?.templateId ||
    cert.course?.certificateTemplate?.style ||
    "CLASSIC_GOLD_V1";

  const templateId = (() => {
    const s = String(rawTemplate).toUpperCase();
    if (s === "CLASSIC_GOLD_V1" || s === "GOLD_A" || s === "CLASSIC_GOLD" || s === "CLASSIC") return "CLASSIC_GOLD_V1";
    if (s === "CLASSIC_GOLD_V2" || s === "GOLD_B" || s === "MODERN_MINIMAL") return "CLASSIC_GOLD_V2";
    if (s === "CLASSIC_GOLD_V3" || s === "GOLD_C" || s === "PREMIUM_DARK") return "CLASSIC_GOLD_V3";
    if (s === "CLASSIC_GOLD_V4" || s === "GOLD_D") return "CLASSIC_GOLD_V4";
    return "CLASSIC_GOLD_V1";
  })();

  const isGraded = Boolean(cert.grade && cert.grade !== "Completed" && cert.score !== null && cert.score !== undefined);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const preferredFilename = buildCertificateFilename(cert);
      await downloadCertificatePdf(cert.id, preferredFilename);
    } catch (err) {
      console.error("Failed to download certificate PDF:", err);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-background/85 backdrop-blur-md animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} />

      <div className="relative w-full max-w-4xl bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-2xl z-10 flex flex-col gap-5 animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
        {/* Modal Actions */}
        <div className="flex justify-between items-center pb-3 border-b border-border/80 print:hidden">
          <div className="flex items-center gap-2">
            <Award size={18} className="text-amber-500" />
            <h3 className="text-sm font-bold text-foreground">
              Official Credential Preview
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-600 transition shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {downloading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Download size={13} />
              )}
              Download PDF
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-foreground text-xs font-semibold transition cursor-pointer"
            >
              <Printer size={13} />
              Print
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl border border-border hover:bg-muted text-foreground transition cursor-pointer"
              aria-label="Close modal"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Certificate Landscape Canvas */}
        <div className="relative overflow-hidden rounded-xl border border-border/80 bg-background/50 p-2 sm:p-4">
          <CertificatePreviewCanvas
            cert={cert}
            templateId={templateId}
            isGraded={isGraded}
          />
        </div>

        {/* Modal Footer Info */}
        <div className="flex justify-between items-center text-xs text-muted-foreground pt-1 print:hidden">
          <span>Standard ISO 216 A4 Landscape Format</span>
          <span>Credential ID: <strong className="font-mono text-foreground">{cert.certificateNo || "CR-01OKK6"}</strong></span>
        </div>
      </div>
    </div>
  );
}

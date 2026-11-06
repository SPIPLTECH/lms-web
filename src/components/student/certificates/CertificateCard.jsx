"use client";

import { useState } from "react";
import { Award, Download, Calendar, Hash, User, Eye, Loader2 } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { downloadCertificatePdf, buildCertificateFilename } from "@/services/certificate.service";

export default function CertificateCard({ cert, onView }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (e) => {
    e.stopPropagation();
    setDownloading(true);
    try {
      const preferredFilename = buildCertificateFilename(cert);
      await downloadCertificatePdf(cert.id, preferredFilename);
    } catch (err) {
      console.error("Failed to download certificate:", err);
    } finally {
      setDownloading(false);
    }
  };

  const studentName = cert.student?.user?.name || cert.user?.name || "Student";
  const rawTemplate = cert.templateId || cert.course?.certificateTemplate?.templateId || cert.course?.certificateTemplate?.style || "CLASSIC_GOLD_V1";
  
  const templateBadge = (() => {
    const s = String(rawTemplate).toUpperCase();
    if (s === "CLASSIC_GOLD_V1" || s === "GOLD_A") return "Traditional Academic";
    if (s === "CLASSIC_GOLD_V2" || s === "GOLD_B") return "Modern Classic";
    if (s === "CLASSIC_GOLD_V3" || s === "GOLD_C") return "Premium Ornamental";
    if (s === "CLASSIC_GOLD_V4" || s === "GOLD_D") return "Royal Minimal";
    if (s === "MODERN_MINIMAL" || s === "MODERN") return "Modern Minimal";
    if (s === "PREMIUM_DARK" || s === "DARK") return "Premium Dark";
    if (s === "TECH_GRADIENT" || s === "TECH") return "Tech Gradient";
    return "Classic Gold";
  })();

  return (
    <Card
      className="
        relative
        overflow-hidden
        transition-all
        duration-300
        hover:border-amber-500/40
        hover:shadow-lg
        hover:-translate-y-0.5
        group
      "
    >
      <div className="flex flex-col gap-5 relative">
        {/* Header Info */}
        <div className="flex justify-between items-start gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
              <Award size={22} />
            </div>
            <span className="text-[9.5px] px-2 py-0.5 rounded-md bg-muted/80 text-muted-foreground font-bold uppercase tracking-wider">
              {templateBadge}
            </span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1">
              <Hash size={10} />
              {cert.certificateNo}
            </span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Calendar size={10} className="text-amber-500/80" />
              {new Date(cert.issuedAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        </div>

        {/* Title & Details */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-bold text-foreground leading-tight group-hover:text-amber-500 transition-colors">
              {cert.course?.title}
            </h3>
            <div className="flex items-center gap-1.5 shrink-0">
              {cert.score !== null && cert.score !== undefined && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-muted text-foreground border border-border">
                  {cert.score}%
                </span>
              )}
              {cert.grade && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  {cert.grade === "Completed" ? "Completed" : `Grade: ${cert.grade}`}
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {cert.courseMemo ||
              cert.performanceDescription ||
              cert.course?.description ||
              "Official Course Completion Credential"}
          </p>
        </div>

        {/* Recipient info & Actions */}
        <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-foreground">
            <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px]">
              <User size={10} className="text-muted-foreground" />
            </div>
            <span className="font-semibold text-xs truncate max-w-[120px]">
              {studentName}
            </span>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => onView(cert)}
              variant="outline"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg"
            >
              <Eye size={12} />
              View
            </Button>
            <Button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold border-none rounded-lg shadow-sm disabled:opacity-50"
            >
              {downloading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Download size={12} />
              )}
              PDF
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

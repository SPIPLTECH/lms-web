"use client";

import { useState } from "react";
import {
  Award,
  CheckCircle,
  FileText,
  Sparkles,
  Save,
  Loader2,
  Eye,
  Check,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  X,
  Maximize2,
} from "lucide-react";
import CertificatePreviewCanvas from "@/components/student/certificates/CertificatePreviewCanvas";

export const CLASSIC_GOLD_TEMPLATES = [
  {
    id: "CLASSIC_GOLD_V1",
    name: "Traditional Academic",
    subtitle: "Formal University Diploma",
    description: "Double-line gold border, formal serif typography, traditional university crest, and prestigious academic rosettes.",
    badge: "Traditional",
    accentColor: "#B8860B",
  },
  {
    id: "CLASSIC_GOLD_V2",
    name: "Modern Classic",
    subtitle: "Contemporary Academic",
    description: "Single refined gold border, prominent recipient focal point, harmonious serif + sans-serif typography with generous whitespace.",
    badge: "Contemporary",
    accentColor: "#C89D35",
  },
  {
    id: "CLASSIC_GOLD_V3",
    name: "Premium Ornamental",
    subtitle: "Heraldic Luxury",
    description: "Handcrafted gold corner filigrees, subtle Course Ranger watermark emblem, rich ivory & gold palette, and engraved dividers.",
    badge: "Ornamental",
    accentColor: "#B45309",
  },
  {
    id: "CLASSIC_GOLD_V4",
    name: "Royal Minimal",
    subtitle: "Refined Luxury",
    description: "Alabaster canvas, thin 1px gold hairline frame, minimalist circular seal, and whisper-light restrained typography.",
    badge: "Minimal",
    accentColor: "#D4AF37",
  },
];

const MEMO_PRESETS = [
  {
    label: "Comprehensive Mastery",
    text: "Awarded in recognition of demonstrated technical competence, consistent academic rigor, and successful completion of all core curriculum milestones and practical assessments.",
  },
  {
    label: "Distinction & Excellence",
    text: "Recognizing exceptional performance, dedication to curriculum mastery, and active problem-solving throughout all course modules and evaluations.",
  },
  {
    label: "Foundation & Applied Skills",
    text: "Certified for completing all required lessons, topics, and practical exercises, establishing foundational proficiency in key course principles.",
  },
];

export default function CertificateSettingsView({
  course,
  onSave,
  isSaving = false,
  role = "INSTRUCTOR",
}) {
  const [enabled, setEnabled] = useState(Boolean(course?.certificatesEnabled));
  const [title, setTitle] = useState(
    course?.certificateTitle || "Certificate of Completion"
  );
  const [description, setDescription] = useState(
    course?.certificateDescription ||
      "for successfully completing all curriculum requirements of"
  );
  const [courseMemo, setCourseMemo] = useState(course?.courseMemo || "");

  // Resolve initial templateId (supporting legacy IDs)
  const initialTemplateId = (() => {
    const t = course?.certificateTemplate?.templateId;
    if (t) {
      const upper = String(t).toUpperCase();
      if (CLASSIC_GOLD_TEMPLATES.some((tpl) => tpl.id === upper)) return upper;
      if (upper === "CLASSIC_GOLD" || upper === "GOLD_A") return "CLASSIC_GOLD_V1";
      if (upper === "GOLD_B" || upper === "MODERN_MINIMAL") return "CLASSIC_GOLD_V2";
      if (upper === "GOLD_C" || upper === "PREMIUM_DARK") return "CLASSIC_GOLD_V3";
      if (upper === "GOLD_D") return "CLASSIC_GOLD_V4";
    }
    return "CLASSIC_GOLD_V1";
  })();

  const [selectedTemplateId, setSelectedTemplateId] = useState(initialTemplateId);
  const [modalPreviewId, setModalPreviewId] = useState(null); // When open, shows full-size modal
  const [previewGraded, setPreviewGraded] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const isInstructor = role === "INSTRUCTOR" || role === "ADMIN";

  const handleTemplateSelect = (templateId) => {
    if (!isInstructor) return;
    setSelectedTemplateId(templateId);
  };

  const handleSaveSettings = async (e) => {
    e?.preventDefault();
    if (!onSave || !isInstructor) return;
    setSavedSuccess(false);
    try {
      const chosenTemplate = CLASSIC_GOLD_TEMPLATES.find((t) => t.id === selectedTemplateId) || CLASSIC_GOLD_TEMPLATES[0];
      await onSave({
        certificatesEnabled: enabled,
        certificateTitle: title.trim() || "Certificate of Completion",
        certificateDescription: description.trim() || null,
        courseMemo: courseMemo.trim() || null,
        certificateTemplate: {
          templateId: selectedTemplateId,
          style: selectedTemplateId.toLowerCase(),
          accentColor: chosenTemplate.accentColor,
          signatoryName: course?.creator?.name || "Prasad Kulkarni",
          signatoryTitle: "Lead Instructor & Evaluator",
        },
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch {
      // Parent handle handles toast
    }
  };

  const sampleCert = {
    certificateNo: "CR-01OKK6",
    studentName: "Naitik Ganvir",
    courseTitle: course?.title || "Web Development Basics (Test Course)",
    brandingName: "COURSE RANGER",
    brandingPoweredBy: "POWERED BY SPIPL",
    certificateTitle: title || "CERTIFICATE OF COMPLETION",
    courseMemo: courseMemo || "Awarded in recognition of demonstrated technical competence and consistent academic rigor.",
    instructorName: course?.creator?.name || course?.author || "Prasad Kulkarni",
    signatoryTitle: "Lead Instructor & Evaluator",
    enrolledAt: "2026-11-04T00:00:00.000Z",
    completedAt: "2026-11-05T00:00:00.000Z",
    issuedAt: "2026-11-05T00:00:00.000Z",
    grade: "A",
    score: 85,
    performanceDescription: "Excellent",
  };

  const activeTemplate =
    CLASSIC_GOLD_TEMPLATES.find((t) => t.id === selectedTemplateId) ||
    CLASSIC_GOLD_TEMPLATES[0];

  return (
    <div className="w-full h-full min-h-0 overflow-hidden">
      {/* =========================================================================
          SPLIT STUDIO: 2-COLUMN VIEWPORT-FITTED WORKSPACE (CANVA / FIGMA STYLE)
          Zero Page Scroll • Dedicated Inspector on Left • Sized Hero Canvas on Right
          ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-[330px_1fr] lg:grid-cols-[350px_1fr] gap-3.5 items-stretch h-full min-h-0 overflow-hidden">
        
        {/* =======================================================================
            LEFT COLUMN: STUDIO CONTROLS & INSPECTOR (SCROLLABLE SIDEBAR)
            ======================================================================= */}
        <div className="rounded-2xl border border-border bg-card p-3.5 sm:p-4 flex flex-col justify-between shadow-sm min-h-0 overflow-y-auto md:overflow-hidden gap-2.5">
          
          {/* Top Enable/Disable Toggle */}
          <div className="flex items-center justify-between pb-2 border-b border-border/70 shrink-0">
            <div>
              <h3 className="text-xs font-black text-foreground uppercase tracking-wide">
                Certificate Status
              </h3>
              <p className="text-[10.5px] text-muted-foreground">
                Issuance criteria for completing students
              </p>
            </div>

            {isInstructor && (
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4.5 bg-muted rounded-full peer peer-checked:bg-amber-500 transition-colors relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:after:translate-x-3.5" />
                <span className="text-[11px] font-bold">
                  {enabled ? (
                    <span className="text-emerald-400">Enabled</span>
                  ) : (
                    <span className="text-muted-foreground">Disabled</span>
                  )}
                </span>
              </label>
            )}
          </div>

          {/* TEMPLATE PICKER: Compact 2x2 Grid Selector */}
          <div className="space-y-1.5 shrink-0">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <ShieldCheck size={12} className="text-amber-500" />
                Select Classic Gold Template
              </label>
              <span className="text-[9.5px] font-semibold text-amber-500">
                {activeTemplate.badge}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {CLASSIC_GOLD_TEMPLATES.map((tpl) => {
                const isSelected = selectedTemplateId === tpl.id;
                const thumbTheme = {
                  CLASSIC_GOLD_V1: { bg: "#FAF9F1", border: "#B8860B" },
                  CLASSIC_GOLD_V2: { bg: "#FCFBF9", border: "#C89D35" },
                  CLASSIC_GOLD_V3: { bg: "#FAF5EB", border: "#B45309" },
                  CLASSIC_GOLD_V4: { bg: "#FBFBFA", border: "#D4AF37" },
                }[tpl.id] || { bg: "#FAF9F1", border: "#B8860B" };

                return (
                  <div
                    key={tpl.id}
                    onClick={() => handleTemplateSelect(tpl.id)}
                    className={`
                      rounded-lg border p-1.5 flex items-center gap-2 cursor-pointer transition-all
                      ${
                        isSelected
                          ? "border-amber-500 bg-amber-500/15 shadow-xs ring-1 ring-amber-500/30"
                          : "border-border bg-background/50 hover:border-border/80 hover:bg-background/80"
                      }
                    `}
                  >
                    <div
                      className="w-6 h-4.5 rounded-xs border flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: thumbTheme.bg,
                        borderColor: isSelected ? tpl.accentColor : `${thumbTheme.border}40`,
                      }}
                    >
                      <span className="text-[6px] font-black uppercase" style={{ color: "#78350f" }}>
                        {tpl.badge[0]}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10.5px] font-bold text-foreground truncate">
                          {tpl.name}
                        </h4>
                        {isSelected && <Check size={10} className="text-amber-500 shrink-0 ml-0.5" />}
                      </div>
                      <p className="text-[9px] text-muted-foreground truncate">
                        {tpl.badge}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* COURSE MEMO (OFFICIAL CITATION) */}
          <div className="space-y-1 shrink-0">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <FileText size={12} className="text-amber-500" />
                Honor Memo (Citation)
              </label>
              <span className="text-[9px] font-mono text-muted-foreground">
                {courseMemo.length} / 2000
              </span>
            </div>

            <textarea
              rows={2}
              maxLength={2000}
              value={courseMemo}
              onChange={(e) => setCourseMemo(e.target.value)}
              placeholder="e.g. Awarded in recognition of demonstrated technical competence..."
              className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground outline-none focus:border-amber-500 transition resize-none"
            />

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[9px] font-bold text-muted-foreground mr-0.5">Presets:</span>
              {MEMO_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCourseMemo(p.text)}
                  className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border transition truncate max-w-[105px]"
                  title={p.text}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* CERTIFICATE TITLE */}
          <div className="space-y-1 shrink-0">
            <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Certificate Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Certificate of Completion"
              className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs font-semibold text-foreground outline-none focus:border-amber-500 transition"
            />
          </div>

          {/* SAVE BUTTON */}
          <div className="pt-2 border-t border-border/80 shrink-0">
            {isInstructor && (
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="w-full btn bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs py-2 px-3 rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Saving Settings...</span>
                  </>
                ) : savedSuccess ? (
                  <>
                    <CheckCircle size={13} className="text-emerald-950" />
                    <span>Saved Successfully!</span>
                  </>
                ) : (
                  <>
                    <Save size={13} />
                    <span>Save Certificate Settings</span>
                  </>
                )}
              </button>
            )}
          </div>

        </div>

        {/* =======================================================================
            RIGHT COLUMN: SIZED LIVE CERTIFICATE ARTBOARD (NO VERTICAL SCROLL)
            ======================================================================= */}
        <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-b from-card/80 to-background/90 p-2.5 sm:p-3.5 flex flex-col justify-between items-center shadow-lg relative overflow-hidden min-h-0">
          
          {/* Floating Canvas Top Toolbar */}
          <div className="w-full max-w-[600px] flex items-center justify-between bg-card/90 border border-border/80 px-3 py-1.5 rounded-xl shadow-xs mb-1.5 backdrop-blur-xs shrink-0">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Eye size={13} className="text-amber-500" />
              <span>Live Landscape Canvas</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase tracking-wide">
                {activeTemplate.name}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground cursor-pointer select-none">
                <span>Show Grades</span>
                <input
                  type="checkbox"
                  checked={previewGraded}
                  onChange={(e) => setPreviewGraded(e.target.checked)}
                  className="rounded border-border accent-amber-500 w-3.5 h-3.5 cursor-pointer"
                />
              </label>

              <button
                type="button"
                onClick={() => setModalPreviewId(selectedTemplateId)}
                className="p-1 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                title="Open Expanded Preview Modal"
              >
                <Maximize2 size={13} />
              </button>
            </div>
          </div>

          {/* SIZED CERTIFICATE PREVIEW CONTAINER */}
          {/* Increased by 25% (480px -> 600px) with zero vertical scroll */}
          <div className="my-auto w-full flex items-center justify-center p-0.5 min-h-0 overflow-hidden">
            <div className="w-full max-w-[600px] max-h-[min(425px,calc(100vh-250px))] aspect-[1.414/1] shadow-2xl rounded-sm overflow-hidden border border-[#B8860B]/40 shrink-0">
              <CertificatePreviewCanvas
                cert={sampleCert}
                templateId={selectedTemplateId}
                isGraded={previewGraded}
              />
            </div>
          </div>

          {/* Subtle Stage Caption */}
          <div className="w-full max-w-[600px] flex items-center justify-between text-[10px] text-muted-foreground/70 pt-1 border-t border-border/40 shrink-0">
            <span>Official 1.414 : 1 Landscape Academic Ratio</span>
            <span>Real-time vector rendering • Changes apply live</span>
          </div>

        </div>

      </div>

      {/* =========================================================================
          FULLSCREEN EXPANDED PREVIEW MODAL
          ========================================================================= */}
      {modalPreviewId && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setModalPreviewId(null)}
        >
          <div
            className="relative w-full max-w-5xl rounded-2xl border border-amber-500/30 bg-card p-4 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Award size={18} className="text-amber-500" />
                <h3 className="text-base font-bold text-foreground">
                  Expanded Certificate Inspection — {CLASSIC_GOLD_TEMPLATES.find((t) => t.id === modalPreviewId)?.name}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {isInstructor && (
                  <button
                    type="button"
                    onClick={() => {
                      handleTemplateSelect(modalPreviewId);
                      setModalPreviewId(null);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                      selectedTemplateId === modalPreviewId
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500 text-slate-950 hover:bg-amber-600"
                    }`}
                  >
                    {selectedTemplateId === modalPreviewId ? "Selected ✓" : "Select This Template"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setModalPreviewId(null)}
                  className="p-1.5 rounded-xl border border-border hover:bg-muted text-foreground transition"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Modal Body Canvas */}
            <div className="relative overflow-hidden rounded-xl border border-border/80 bg-background/50 p-2 sm:p-4">
              <CertificatePreviewCanvas
                cert={sampleCert}
                templateId={modalPreviewId}
                isGraded={previewGraded}
              />
            </div>

            {/* Modal Navigation Footer */}
            <div className="flex justify-between items-center pt-2 border-t border-border text-xs text-muted-foreground">
              <button
                type="button"
                onClick={() => {
                  const idx = CLASSIC_GOLD_TEMPLATES.findIndex((t) => t.id === modalPreviewId);
                  const prevIdx = (idx - 1 + CLASSIC_GOLD_TEMPLATES.length) % CLASSIC_GOLD_TEMPLATES.length;
                  setModalPreviewId(CLASSIC_GOLD_TEMPLATES[prevIdx].id);
                }}
                className="px-3 py-1 rounded-lg border border-border hover:bg-muted text-foreground font-semibold flex items-center gap-1 transition"
              >
                <ChevronLeft size={14} />
                Previous Design
              </button>

              <span className="font-mono text-[11px]">
                {CLASSIC_GOLD_TEMPLATES.findIndex((t) => t.id === modalPreviewId) + 1} of {CLASSIC_GOLD_TEMPLATES.length}
              </span>

              <button
                type="button"
                onClick={() => {
                  const idx = CLASSIC_GOLD_TEMPLATES.findIndex((t) => t.id === modalPreviewId);
                  const nextIdx = (idx + 1) % CLASSIC_GOLD_TEMPLATES.length;
                  setModalPreviewId(CLASSIC_GOLD_TEMPLATES[nextIdx].id);
                }}
                className="px-3 py-1 rounded-lg border border-border hover:bg-muted text-foreground font-semibold flex items-center gap-1 transition"
              >
                Next Design
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

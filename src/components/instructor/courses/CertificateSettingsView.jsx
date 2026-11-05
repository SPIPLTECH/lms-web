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

  const isInstructor = role === "INSTRUCTOR";

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
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      console.error("Failed to save certificate template:", err);
    }
  };

  // Mock certificate object for live preview
  const sampleCert = {
    studentName: "Naitik Ganvir",
    courseTitle: course?.title || "Web Development Basics (Test Course)",
    certificateTitle: title || "Certificate of Completion",
    courseMemo: courseMemo || "Awarded in recognition of demonstrated technical competence and consistent academic rigor.",
    grade: "A",
    score: 85,
    performanceDescription: "Excellent",
    enrolledAt: new Date("2026-11-04T06:22:44Z"),
    completedAt: new Date("2026-11-05T06:22:44Z"),
    issuedAt: new Date("2026-11-05T06:22:44Z"),
    certificateNo: "CR-01OKK6",
    instructorName: course?.creator?.name || "Prasad Kulkarni",
    signatoryTitle: "Lead Instructor & Evaluator",
  };

  const activeTemplate = CLASSIC_GOLD_TEMPLATES.find((t) => t.id === selectedTemplateId) || CLASSIC_GOLD_TEMPLATES[0];

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 space-y-7">
      {/* Header and Toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Award size={18} />
            </div>
            <h3 className="text-base font-bold text-foreground">
              Certificate Settings & Template Gallery
            </h3>
          </div>
          <p className="text-xs text-muted-foreground max-w-xl">
            Select one of four approved <strong>Classic Gold</strong> certificate designs.
            When enabled, completing students automatically receive credentials rendered with your chosen design.
          </p>
        </div>

        {/* Enable / Disable Toggle Switch */}
        {isInstructor && (
          <label className="flex items-center gap-3 cursor-pointer self-start sm:self-auto select-none p-2.5 rounded-xl bg-background/80 border border-border hover:border-amber-500/50 transition">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-muted rounded-full peer peer-checked:bg-amber-500 transition-colors relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
            <span className="text-xs font-bold text-foreground">
              {enabled ? (
                <span className="text-emerald-400">Certificates Enabled</span>
              ) : (
                <span className="text-muted-foreground">Certificates Disabled</span>
              )}
            </span>
          </label>
        )}
      </div>

      {/* SECTION 1: TEMPLATE GALLERY (4 CLASSIC GOLD CARDS) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-amber-500" />
            <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider">
              Classic Gold Studio — 4 Approved Templates
            </h4>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Select template for student issuances
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CLASSIC_GOLD_TEMPLATES.map((tpl) => {
            const isSelected = selectedTemplateId === tpl.id;
            return (
              <div
                key={tpl.id}
                onClick={() => handleTemplateSelect(tpl.id)}
                className={`
                  relative
                  rounded-2xl
                  border-2
                  p-3.5
                  flex
                  flex-col
                  justify-between
                  gap-3
                  cursor-pointer
                  transition-all
                  duration-200
                  ${
                    isSelected
                      ? "border-amber-500 bg-amber-500/5 shadow-md shadow-amber-500/10 ring-2 ring-amber-500/20 -translate-y-0.5"
                      : "border-border bg-background/60 hover:border-border/80 hover:bg-background/90"
                  }
                `}
              >
                {/* Top Badge & Indicator */}
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 border border-amber-500/30 uppercase tracking-wide">
                    {tpl.badge}
                  </span>
                  {isSelected ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                      <Check size={12} />
                      Selected
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">Click to select</span>
                  )}
                </div>

                {/* Landscape Thumbnail Preview Frame */}
                <div
                  className="relative w-full aspect-[1.414/1] rounded-lg overflow-hidden border border-border/80 bg-background/90 p-2 flex flex-col justify-between group shadow-sm"
                  style={{
                    borderColor: isSelected ? tpl.accentColor : undefined,
                  }}
                >
                  <div className="text-center space-y-0.5">
                    <span className="text-[6.5px] font-bold uppercase tracking-widest text-muted-foreground block">
                      Course Ranger
                    </span>
                    <span className="text-[7.5px] font-serif font-black uppercase text-amber-800 dark:text-amber-600 block leading-tight">
                      {tpl.name}
                    </span>
                  </div>

                  <div className="my-auto text-center space-y-0.5">
                    <span className="text-[9px] font-black underline decoration-amber-500/50 block">
                      Naitik Ganvir
                    </span>
                    <span className="text-[6px] text-muted-foreground truncate max-w-[120px] mx-auto block">
                      Web Development Basics
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[5.5px] opacity-65 border-t border-current/20 pt-1">
                    <span>Nov 4 • Nov 5</span>
                    <span className="font-bold">CR-01OKK6</span>
                  </div>

                  {/* Hover Overlay for Preview */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setModalPreviewId(tpl.id);
                    }}
                    className="absolute inset-0 bg-background/80 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5"
                  >
                    <button
                      type="button"
                      className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 text-[10px] font-bold flex items-center gap-1 shadow"
                    >
                      <Eye size={12} />
                      Preview Full
                    </button>
                  </div>
                </div>

                {/* Template Info & Action */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-foreground">
                      {tpl.name}
                    </h5>
                  </div>
                  <p className="text-[10px] text-muted-foreground line-clamp-2 leading-tight">
                    {tpl.description}
                  </p>
                </div>

                {/* Card Action Buttons */}
                <div className="flex gap-2 pt-1 border-t border-border/60">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setModalPreviewId(tpl.id);
                    }}
                    className="flex-1 py-1 px-2 rounded-lg border border-border text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition flex items-center justify-center gap-1"
                  >
                    <Eye size={11} />
                    Preview
                  </button>
                  {isInstructor && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTemplateSelect(tpl.id);
                      }}
                      className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 ${
                        isSelected
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500 text-slate-950 hover:bg-amber-600"
                      }`}
                    >
                      {isSelected ? "Selected ✓" : "Select"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: LIVE PREVIEW & COURSE MEMO CONFIGURATION */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-6 items-start pt-4 border-t border-border/80">
        
        {/* Left Column: Live Landscape Certificate Canvas */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Eye size={14} className="text-amber-500" />
              Live Landscape Preview ({activeTemplate.name})
            </span>

            {/* Graded vs Ungraded Toggle */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground cursor-pointer">
                <span>Graded Preview</span>
                <input
                  type="checkbox"
                  checked={previewGraded}
                  onChange={(e) => setPreviewGraded(e.target.checked)}
                  className="rounded border-border accent-amber-500 w-3.5 h-3.5"
                />
              </label>
              <button
                type="button"
                onClick={() => setModalPreviewId(selectedTemplateId)}
                className="p-1 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition"
                title="Open Expanded Preview"
              >
                <Maximize2 size={13} />
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border/80 bg-background/50 p-2 shadow-inner">
            <CertificatePreviewCanvas
              cert={sampleCert}
              templateId={selectedTemplateId}
              isGraded={previewGraded}
            />
          </div>
        </div>

        {/* Right Column: Instructor Configuration */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
              <FileText size={14} className="text-amber-500" />
              Course Memo & Presentation Details
            </span>
          </div>

          {/* COURSE MEMO — Institutional Citation */}
          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                <FileText size={13} className="text-amber-500" />
                Course Memo (Official Citation)
              </label>
              <span className="text-[10px] font-mono text-muted-foreground">
                {courseMemo.length} / 2000
              </span>
            </div>
            <p className="text-[10.5px] text-muted-foreground leading-normal">
              This citation is printed on every generated certificate for this course. Configure it once and it automatically attaches to all completing students.
            </p>
            <textarea
              rows={3}
              maxLength={2000}
              value={courseMemo}
              onChange={(e) => setCourseMemo(e.target.value)}
              placeholder="e.g. Awarded in recognition of demonstrated technical competence, consistent academic rigor, and successful completion of all core curriculum milestones."
              className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground outline-none focus:border-amber-500 transition resize-y"
            />

            {/* Presets */}
            <div className="pt-1 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                <Sparkles size={11} className="text-amber-500" />
                Presets:
              </span>
              {MEMO_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setCourseMemo(p.text)}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 text-foreground transition cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Certificate Title */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">
              Certificate Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Certificate of Completion"
              className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-xs font-semibold text-foreground outline-none focus:border-amber-500 transition"
            />
          </div>

          {/* Presentation Subtitle */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">
              Presentation Subtitle
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. for successfully completing all curriculum requirements of"
              className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-xs text-foreground outline-none focus:border-amber-500 transition"
            />
          </div>

          {/* Save Action */}
          {isInstructor && (
            <div className="pt-2 flex items-center justify-between">
              <div>
                {savedSuccess && (
                  <span className="text-xs text-emerald-400 font-bold inline-flex items-center gap-1 animate-in fade-in">
                    <CheckCircle size={14} />
                    Template configuration saved successfully!
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-600 transition flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                Save Certificate Settings
              </button>
            </div>
          )}
        </div>
      </div>

      {/* FULL-SIZE PREVIEW MODAL */}
      {modalPreviewId && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-background/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="absolute inset-0 cursor-default" onClick={() => setModalPreviewId(null)} />
          <div className="relative w-full max-w-4xl bg-card border border-border rounded-2xl p-6 sm:p-7 shadow-2xl z-10 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <div>
                <h4 className="text-sm font-bold text-foreground">
                  {CLASSIC_GOLD_TEMPLATES.find((t) => t.id === modalPreviewId)?.name}
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  {CLASSIC_GOLD_TEMPLATES.find((t) => t.id === modalPreviewId)?.description}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mr-3 cursor-pointer">
                  <span>Graded Preview</span>
                  <input
                    type="checkbox"
                    checked={previewGraded}
                    onChange={(e) => setPreviewGraded(e.target.checked)}
                    className="rounded border-border accent-amber-500 w-3.5 h-3.5"
                  />
                </label>

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

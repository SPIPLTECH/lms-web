"use client";

import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/700.css";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Award,
  ArrowLeft,
  BookOpen,
  Image as ImageIcon,
  Building2,
  PenTool,
  Stamp,
  Palette,
  Type,
  Plus,
  Eye,
  Save,
  UploadCloud,
  Sparkles,
  Zap,
  X,
} from "lucide-react";
import Link from "next/link";
import useAuth from "@/hooks/useAuth";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";

import { useInstructorCourses } from "@/hooks/queries/instructor/useInstructorCourses";

const DYNAMIC_FIELDS = [
  { label: "Student Name", token: "{{Student Name}}" },
  { label: "Course Name", token: "{{Course Name}}" },
  { label: "Completion Date", token: "{{Completion Date}}" },
  { label: "Certificate ID", token: "{{Certificate ID}}" },
  { label: "Instructor Name", token: "{{Instructor Name}}" },
  { label: "Institute Name", token: "{{Institute Name}}" },
];

const FONT_OPTIONS = [
  { label: "Elegant Serif — Playfair Display", value: "'Playfair Display', Georgia, serif" },
  { label: "Classic Serif — Georgia", value: "Georgia, 'Times New Roman', serif" },
  { label: "Modern Sans — Poppins", value: "'Poppins', sans-serif" },
  { label: "Clean Sans — Inter", value: "Inter, sans-serif" },
  { label: "Script — Great Vibes", value: "'Great Vibes', cursive" },
];

const DEFAULT_BODY_TEXT =
  "This is to certify that {{Student Name}} has successfully completed the course {{Course Name}} on {{Completion Date}}, awarded by {{Institute Name}}.\n\nCertificate ID: {{Certificate ID}}";

function AssetUploader({ icon: Icon, label, hint, asset, onChange, onRemove }) {
  const inputRef = useRef(null);

  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-foreground flex items-center gap-2">
        <Icon size={16} className="text-primary" /> {label}
      </label>
      <div
        onClick={() => inputRef.current?.click()}
        className="relative h-28 rounded-xl border border-dashed border-transparent bg-background/50 hover:border-primary/40 transition-all cursor-pointer flex items-center justify-center overflow-hidden group"
      >
        {asset ? (
          <>
            <img src={asset.url} alt={label} className="max-h-full max-w-full object-contain p-2" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-background/80 text-muted-foreground hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={12} />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
            <UploadCloud size={20} />
            <span className="text-[11px] font-semibold">Click to upload</span>
          </div>
        )}
      </div>
      {hint && <p className="text-[11px] text-slate-600">{hint}</p>}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onChange} />
    </div>
  );
}

function CertificatePreview({ assets, primaryColor, font, bodyText, values, size = "sm" }) {
  const resolvedText = useMemo(() => {
    let out = bodyText;
    Object.entries(values).forEach(([token, val]) => {
      out = out.split(token).join(val || token);
    });
    return out;
  }, [bodyText, values]);

  const isLg = size === "lg";

  return (
    <div
      className="relative w-full aspect-[1.414/1] rounded-xl overflow-hidden border-2 shadow-lg bg-background flex flex-col"
      style={{ borderColor: primaryColor, fontFamily: font }}
    >
      {assets.background && (
        <img src={assets.background.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/50 via-slate-950/10 to-slate-950/70" />

      <div className={`relative flex-1 flex flex-col items-center justify-between text-center ${isLg ? "p-10" : "p-3 sm:p-4"}`}>
        <div className="flex flex-col items-center gap-1.5">
          {assets.logo && (
            <img src={assets.logo.url} alt="Institute logo" className={isLg ? "h-14 object-contain" : "h-7 object-contain"} />
          )}
          <p
            className="uppercase tracking-[0.25em] text-foreground font-bold"
            style={{ fontSize: isLg ? 12 : 7 }}
          >
            {values["{{Institute Name}}"]}
          </p>
        </div>

        <div className="space-y-2">
          <h2 className={`font-black ${isLg ? "text-3xl" : "text-sm"}`} style={{ color: primaryColor }}>
            Certificate of Completion
          </h2>
          <p
            className={`text-foreground/90 leading-relaxed whitespace-pre-line ${
              isLg ? "text-sm max-w-xl mx-auto" : "text-[7px] max-w-[220px] mx-auto"
            }`}
          >
            {resolvedText}
          </p>
        </div>

        <div className="w-full flex items-end justify-between px-1">
          <div className="flex flex-col items-center gap-1">
            {assets.signature ? (
              <img src={assets.signature.url} alt="Signature" className={isLg ? "h-10 object-contain" : "h-5 object-contain"} />
            ) : (
              <div className={isLg ? "h-10" : "h-5"} />
            )}
            <p
              className={`border-t border-white/30 text-foreground/70 font-semibold whitespace-nowrap ${
                isLg ? "text-[10px] px-6 pt-1" : "text-[5px] px-2 pt-0.5"
              }`}
            >
              {values["{{Instructor Name}}"]}
            </p>
          </div>
          {assets.seal && (
            <img src={assets.seal.url} alt="Organization seal" className={isLg ? "h-14 w-14 object-contain" : "h-7 w-7 object-contain"} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function CertificateTemplateBuilderPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  // Template Information
  const [templateName, setTemplateName] = useState("");
  const [courseId, setCourseId] = useState("");
  const [description, setDescription] = useState("");

  // Certificate Designer
  const [assets, setAssets] = useState({ background: null, logo: null, signature: null, seal: null });
  const [primaryColor, setPrimaryColor] = useState("#f2c7c7");
  const [font, setFont] = useState(FONT_OPTIONS[0].value);

  // Dynamic Fields / body text
  const [bodyText, setBodyText] = useState(DEFAULT_BODY_TEXT);
  const bodyTextRef = useRef(null);

  // Auto-Issue Settings
  const [autoIssueEnabled, setAutoIssueEnabled] = useState(true);
  const [notifyStudent, setNotifyStudent] = useState(true);

  const [status, setStatus] = useState("draft");
  const [previewOpen, setPreviewOpen] = useState(false);

  const { data: courses = [], isLoading: loadingCourses } = useInstructorCourses();

  const myCourses = useMemo(
    () => courses.filter((c) => c.creatorId === user?.id || c.instructorId === user?.id),
    [courses, user?.id]
  );

  const selectedCourse = useMemo(() => myCourses.find((c) => c.id === courseId), [myCourses, courseId]);

  useEffect(() => {
    return () => {
      Object.values(assets).forEach((asset) => asset?.url && URL.revokeObjectURL(asset.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAssetChange = (key) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAssets((prev) => {
      if (prev[key]?.url) URL.revokeObjectURL(prev[key].url);
      return { ...prev, [key]: { file, url: URL.createObjectURL(file) } };
    });
    e.target.value = "";
  };

  const handleAssetRemove = (key) => () => {
    setAssets((prev) => {
      if (prev[key]?.url) URL.revokeObjectURL(prev[key].url);
      return { ...prev, [key]: null };
    });
  };

  const insertField = (token) => {
    const el = bodyTextRef.current;
    if (!el) {
      setBodyText((prev) => `${prev} ${token}`);
      return;
    }
    const start = el.selectionStart ?? bodyText.length;
    const end = el.selectionEnd ?? bodyText.length;
    const next = `${bodyText.slice(0, start)}${token}${bodyText.slice(end)}`;
    setBodyText(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const previewValues = useMemo(
    () => ({
      "{{Student Name}}": "Aarav Sharma",
      "{{Course Name}}": selectedCourse?.title || "Sample Course Title",
      "{{Completion Date}}": new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
      "{{Certificate ID}}": "OTL-CERT-2026-0001",
      "{{Instructor Name}}": user?.name || "Instructor Name",
      "{{Institute Name}}": "Orange Tree LMS",
    }),
    [selectedCourse, user]
  );

  const handleSaveDraft = () => {
    setStatus("draft");
    showToast("Template saved as draft.", "success", "Saved");
  };

  const handlePublish = () => {
    if (!templateName.trim() || !courseId) {
      showToast("Add a template name and select an applicable course before publishing.", "error", "Missing details");
      return;
    }
    setStatus("published");
    showToast("Template published. It will auto-issue once a student completes this course.", "success", "Published");
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      <Link href="/instructor/courses" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft size={16} /> Back to My Courses
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="sr-only">
            Certificate Template Builder
          </h1>
          <p className="sr-only">
            Design the certificate students receive automatically. Certificates are issued by the system the
            moment a student completes 100% of the course — no manual issuing required.
          </p>
        </div>
        <span
          className={`shrink-0 self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${
            status === "published" ? "bg-emerald-500/10 text-emerald-400" : "bg-muted/60 text-muted-foreground"
          }`}
        >
          <Sparkles size={12} /> {status === "published" ? "Published" : "Draft"}
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
        {/* Left column: form sections */}
        <div className="space-y-6 min-w-0">
          {/* 1. Template Information */}
          <Card className="p-6 md:p-8 border-border bg-card space-y-5">
            <h2 className="text-base font-black text-foreground flex items-center gap-2">
              <Type size={17} className="text-primary" /> Template Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">Template Name</label>
                <Input
                  placeholder="e.g. Standard Completion Certificate"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground flex items-center gap-2">
                  <BookOpen size={16} className="text-primary" /> Applicable Course
                </label>
                {loadingCourses ? (
                  <div className="h-12 flex items-center px-4 rounded-xl bg-background/50 border border-transparent text-muted-foreground text-sm">
                    Loading courses...
                  </div>
                ) : (
                  <select
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-background/50 border border-transparent text-foreground focus:border-primary/50 focus:ring-1 focus:ring-orange-500/20 transition-all outline-none"
                  >
                    <option value="">-- Choose a course --</option>
                    {myCourses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground">Template Description</label>
              <textarea
                rows={3}
                placeholder="Internal note describing when/why this template is used..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-background/50 border border-transparent text-foreground text-sm placeholder-slate-600 focus:border-primary/50 focus:ring-1 focus:ring-orange-500/20 transition-all outline-none resize-none"
              />
            </div>
          </Card>

          {/* 2. Certificate Designer */}
          <Card className="p-6 md:p-8 border-border bg-card space-y-5">
            <h2 className="text-base font-black text-foreground flex items-center gap-2">
              <Palette size={17} className="text-primary" /> Certificate Designer
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <AssetUploader
                icon={ImageIcon}
                label="Certificate Background"
                hint="Recommended: landscape, high resolution."
                asset={assets.background}
                onChange={handleAssetChange("background")}
                onRemove={handleAssetRemove("background")}
              />
              <AssetUploader
                icon={Building2}
                label="Institute Logo"
                hint="Transparent PNG works best."
                asset={assets.logo}
                onChange={handleAssetChange("logo")}
                onRemove={handleAssetRemove("logo")}
              />
              <AssetUploader
                icon={PenTool}
                label="Instructor Signature"
                hint="Transparent PNG works best."
                asset={assets.signature}
                onChange={handleAssetChange("signature")}
                onRemove={handleAssetRemove("signature")}
              />
              <AssetUploader
                icon={Stamp}
                label="Organization Seal"
                hint="Transparent PNG works best."
                asset={assets.seal}
                onChange={handleAssetChange("seal")}
                onRemove={handleAssetRemove("seal")}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Palette size={16} className="text-primary" /> Primary Color
                </label>
                <div className="flex items-center gap-3 h-12 px-3 rounded-xl bg-background/50 border border-transparent">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-8 w-10 rounded-lg cursor-pointer bg-transparent border-none"
                  />
                  <span className="text-sm text-foreground font-mono uppercase">{primaryColor}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Type size={16} className="text-primary" /> Font Selection
                </label>
                <select
                  value={font}
                  onChange={(e) => setFont(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl bg-background/50 border border-transparent text-foreground focus:border-primary/50 focus:ring-1 focus:ring-orange-500/20 transition-all outline-none"
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* 3. Dynamic Fields */}
          <Card className="p-6 md:p-8 border-border bg-card space-y-4">
            <div>
              <h2 className="text-base font-black text-foreground flex items-center gap-2">
                <Plus size={17} className="text-primary" /> Dynamic Fields
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Click a field to insert it into the certificate text at your cursor position.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {DYNAMIC_FIELDS.map((field) => (
                <button
                  key={field.token}
                  type="button"
                  onClick={() => insertField(field.token)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background/50 border border-transparent text-xs font-bold text-foreground hover:border-primary/50 hover:text-primary transition-all"
                >
                  <Plus size={12} /> {field.label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground">Certificate Text</label>
              <textarea
                ref={bodyTextRef}
                rows={5}
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-background/50 border border-transparent text-foreground text-sm placeholder-slate-600 focus:border-primary/50 focus:ring-1 focus:ring-orange-500/20 transition-all outline-none resize-none font-mono"
              />
            </div>
          </Card>

          {/* 5. Auto-Issue Settings */}
          <Card className="p-6 md:p-8 border-border bg-card space-y-5">
            <h2 className="text-base font-black text-foreground flex items-center gap-2">
              <Zap size={17} className="text-primary" /> Auto-Issue Settings
            </h2>
            <p className="text-xs text-muted-foreground">
              Certificates are generated and delivered automatically — there is no manual issuing step.
            </p>

            <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-background/50 border border-transparent">
              <div>
                <p className="text-sm font-bold text-foreground">Auto-issue when eligible</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  The system automatically generates and issues this certificate once a student meets the course's completion requirements.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={autoIssueEnabled}
                onClick={() => setAutoIssueEnabled((v) => !v)}
                className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${
                  autoIssueEnabled ? "bg-primary" : "bg-slate-700"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    autoIssueEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-background/50 border border-transparent">
              <div>
                <p className="text-sm font-bold text-foreground">Notify student by email</p>
                <p className="text-xs text-muted-foreground mt-0.5">Send an email with the certificate once it is auto-issued.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={notifyStudent}
                onClick={() => setNotifyStudent((v) => !v)}
                className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${
                  notifyStudent ? "bg-primary" : "bg-slate-700"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    notifyStudent ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </Card>

          {/* 6. Actions */}
          <Card className="p-5 sm:p-6 border-border bg-card">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                onClick={handleSaveDraft}
                className="flex-1 h-12 bg-muted hover:bg-muted flex items-center justify-center gap-2 font-bold"
              >
                <Save size={16} /> Save Template
              </Button>
              <Button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="flex-1 h-12 bg-muted hover:bg-muted flex items-center justify-center gap-2 font-bold"
              >
                <Eye size={16} /> Preview Template
              </Button>
              <Button
                type="button"
                onClick={handlePublish}
                className="flex-1 h-12 bg-orange-600 hover:bg-primary flex items-center justify-center gap-2 font-bold"
              >
                <Sparkles size={16} /> Publish Template
              </Button>
            </div>
          </Card>
        </div>

        {/* Right column: 4. Live Certificate Preview */}
        <div className="xl:sticky xl:top-6 space-y-3">
          <Card className="p-5 border-border bg-card space-y-4">
            <h2 className="text-base font-black text-foreground flex items-center gap-2">
              <Eye size={17} className="text-primary" /> Live Certificate Preview
            </h2>
            <CertificatePreview
              assets={assets}
              primaryColor={primaryColor}
              font={font}
              bodyText={bodyText}
              values={previewValues}
              size="sm"
            />
            <p className="text-[11px] text-slate-600 text-center">Preview uses sample data to illustrate the final layout.</p>
          </Card>
        </div>
      </div>

      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title="Certificate Preview" size="xl">
        <CertificatePreview
          assets={assets}
          primaryColor={primaryColor}
          font={font}
          bodyText={bodyText}
          values={previewValues}
          size="lg"
        />
      </Modal>
    </div>
  );
}

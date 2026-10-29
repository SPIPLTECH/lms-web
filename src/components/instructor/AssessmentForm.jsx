"use client";

import { useEffect, useState } from "react";
import { Paperclip, X, Loader2 } from "lucide-react";

import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { uploadAttachment } from "@/services/upload.service";

const ASSESSMENT_TYPES = ["Homework", "Project", "Case Study", "Practical", "Written Test", "Presentation"];

const INITIAL_FORM = {
  courseId: "",
  title: "",
  description: "",
  assessmentType: ASSESSMENT_TYPES[0],
  marks: 100,
  dueDate: "",
  totalQuestions: 0,
  estimatedTime: 0,
  resources: 0,
  isPublished: true,
  attachments: [],
};

/**
 * "Assessment" (backend: Assignment model) edit form — used by the global
 * /instructor/assignments page to edit assignments that already exist.
 * Creation now happens only as an "Assignment" content cell in the Course
 * Composer (see LessonComposer/cells/AssignmentCell.tsx), which persists a
 * plain Content row rather than an Assignment record, so this form's
 * `mode="create"` path is no longer reachable from the UI but is kept as-is
 * since it's still exercised by `mode="edit"`.
 */
export default function AssessmentForm({
  mode = "create",
  initialValues = null,
  courses = [],
  lockedCourseId = null,
  loading = false,
  submitError = "",
  // Replaces the Publish / Save Draft wording where submitting only saves edits.
  submitLabel = null,
  onSubmit,
  // Extra fields shown above the submit button (e.g. auto-evaluation settings).
  children = null,
}) {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [uploading, setUploading] = useState(false);

  // An assignment authored elsewhere (course JSON import, the API) can carry a
  // type outside the presets; list it rather than showing the first preset
  // while a different value is actually selected.
  const assessmentTypeOptions =
    formData.assessmentType && !ASSESSMENT_TYPES.includes(formData.assessmentType)
      ? [formData.assessmentType, ...ASSESSMENT_TYPES]
      : ASSESSMENT_TYPES;

  useEffect(() => {
    if (initialValues) {
      setFormData({
        ...INITIAL_FORM,
        ...initialValues,
        courseId: initialValues.courseId || initialValues.course?.id || "",
        dueDate: initialValues.dueDate ? new Date(initialValues.dueDate).toISOString().split("T")[0] : "",
        attachments: initialValues.attachments || [],
      });
    } else if (lockedCourseId) {
      setFormData((prev) => ({ ...prev, courseId: lockedCourseId }));
    }
  }, [initialValues, lockedCourseId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploaded = await Promise.all(files.map((file) => uploadAttachment(file)));
      setFormData((prev) => ({
        ...prev,
        attachments: [
          ...prev.attachments,
          ...uploaded.map((f) => ({ url: f.fileUrl, name: f.fileName, type: f.type })),
        ],
      }));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeAttachment = (index) => {
    setFormData((prev) => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== index) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      marks: Number(formData.marks),
      totalQuestions: Number(formData.totalQuestions),
      estimatedTime: Number(formData.estimatedTime),
      resources: Number(formData.resources),
    };
    onSubmit?.(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {submitError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold p-3 rounded-xl">
          {submitError}
        </div>
      )}

      {!lockedCourseId && (
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Target Course</label>
          <select
            name="courseId"
            value={formData.courseId}
            onChange={handleChange}
            required
            disabled={mode === "edit"}
            className="w-full rounded-lg border border-transparent bg-background px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-primary disabled:opacity-50"
          >
            <option value="">-- Select Course --</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <Input
        label="Assessment Name"
        name="title"
        placeholder="e.g. Mid-Term Case Study Analysis"
        value={formData.title}
        onChange={handleChange}
        required
      />

      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</label>
        <textarea
          name="description"
          rows={4}
          placeholder="Assessment brief, directions and grading criteria..."
          value={formData.description}
          onChange={handleChange}
          className="w-full resize-none rounded-lg border border-transparent bg-background px-4 py-2.5 text-xs text-foreground outline-none focus:border-primary"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Assessment Type</label>
          <select
            name="assessmentType"
            value={formData.assessmentType}
            onChange={handleChange}
            className="w-full rounded-lg border border-transparent bg-background px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-primary"
          >
            {assessmentTypeOptions.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <Input label="Marks" name="marks" type="number" min="0" value={formData.marks} onChange={handleChange} required />
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Due Date</label>
          <input
            type="date"
            name="dueDate"
            value={formData.dueDate}
            onChange={handleChange}
            required
            className="w-full rounded-lg border border-transparent bg-background px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-primary"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Attach Files</label>
        <label className="flex items-center gap-2 w-fit px-3.5 py-2.5 rounded-lg border border-dashed border-transparent bg-background text-xs text-foreground hover:border-primary cursor-pointer transition">
          {uploading ? <Loader2 size={13} className="animate-spin" /> : <Paperclip size={13} />}
          {uploading ? "Uploading..." : "Choose files"}
          <input type="file" multiple className="hidden" onChange={handleFileChange} disabled={uploading} />
        </label>
        {formData.attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {formData.attachments.map((att, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted border border-transparent text-[10.5px] text-foreground">
                {att.name}
                <button type="button" onClick={() => removeAttachment(i)} className="text-muted-foreground hover:text-red-400">
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 bg-background/40 p-3 rounded-lg border border-slate-850">
        <input
          type="checkbox"
          id="isPublished"
          name="isPublished"
          checked={formData.isPublished}
          onChange={handleChange}
          className="h-4 w-4 rounded border-transparent bg-background text-primary focus:ring-orange-500 focus:ring-offset-slate-900 cursor-pointer"
        />
        <label htmlFor="isPublished" className="text-xs font-semibold text-foreground cursor-pointer select-none">
          Publish immediately (uncheck to Save Draft)
        </label>
      </div>

      {children}

      <div className="flex justify-end gap-3 pt-3 border-t border-slate-850">
        <Button type="submit" disabled={loading || uploading}>
          {loading ? "Saving..." : submitLabel || (formData.isPublished ? "Publish" : "Save Draft")}
        </Button>
      </div>
    </form>
  );
}

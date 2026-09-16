"use client";

import { useState } from "react";
import { Archive, ChevronRight } from "lucide-react";
import { UploadButton } from "@/components/instructor/courses/UploadButton";
import { getDisplayUrl } from "@/lib/blob";
import { LessonComposerPanel } from "@/components/instructor/LessonComposer/LessonComposerPanel";

export function CourseOverviewView({
  course,
  courseForm,
  setCourseForm,
  isEditing,
  setIsEditing,
  onSaveCourseMeta,
  isSaving,
  modules = [],
  onSelectModule,
  onSelectQuiz,
  onAddQuiz,
  onAddModule,
  role = "INSTRUCTOR",
  onStartLearning,
  hasProgress = false,
  isDraftMode = false,
  contentAutoOpenSignal: externalContentAutoOpenSignal = 0,
  onContentAutoOpenConsumed,
  onPublishClick,
  onUnpublishClick,
  onRestoreClick,
  hasUnsavedChanges = false,
  onSaveCourse,
  isSavingCourse = false,
  // Opt-in, student course-details only. Below lg that page composes its own
  // hero and overview sections, so this view contributes only the module list
  // there, restyled as a scannable mobile list. Off by default: Instructor
  // rendering is unchanged.
  mobileCompact = false,
}) {
  const status = course?.status || "DRAFT";
  const isPublished = status === "PUBLISHED";
  const isArchived = status === "ARCHIVED";
  const isDraft = status === "DRAFT";
  const hideOnMobile = mobileCompact ? "max-lg:hidden" : "";
  const [localContentAutoOpenSignal, setContentAutoOpenSignal] = useState(0);
  const contentAutoOpenSignal = externalContentAutoOpenSignal + localContentAutoOpenSignal;
  const handleContentAutoOpenConsumed = () => {
    setContentAutoOpenSignal(0);
    onContentAutoOpenConsumed?.();
  };
  return (
    <div className={`notebook-cell rounded-2xl border border-border bg-background p-3 sm:p-5 shadow-md ${isEditing ? "active-cell border-primary/50" : ""} ${mobileCompact ? "max-lg:rounded-none max-lg:border-0 max-lg:bg-transparent max-lg:p-0 max-lg:shadow-none" : ""}`}>
      {/* Left Action Bar — composer-only labeling, never shown to students */}
      {role !== "STUDENT" && (
        <div className={`cell-actions-left mb-3 ${hideOnMobile}`}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted, #94a3b8)", textAlign: "center" }}>
            Course Meta
          </div>
        </div>
      )}

      <div className="cell-main space-y-4">
        {/* Cell Header Toolbar matching PageComponents.js */}
        <div className={`cell-header flex flex-wrap items-center justify-between gap-2 border-b border-border/80 pb-2.5 mb-3 ${hideOnMobile}`}>
          <div className="flex items-center gap-2.5">
            {role !== "STUDENT" && (
              <span className="cell-badge rounded bg-primary/15 border border-primary/30 px-2.5 py-1 text-[12px] font-black uppercase tracking-wider text-primary">
                Course Header
              </span>
            )}
            {role !== "STUDENT" && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider border shrink-0 ${
                  isPublished
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : isArchived
                    ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                }`}
              >
                {status}
              </span>
            )}
          </div>
          <div className="cell-controls flex flex-wrap items-center gap-2">
            {role === "STUDENT" && onStartLearning && (
              <button
                type="button"
                onClick={onStartLearning}
                className="btn bg-primary hover:bg-orange-600 text-slate-950 rounded-xl px-4 py-1.5 text-sm font-black transition cursor-pointer"
              >
                {hasProgress ? "Continue Learning" : "Start Learning"}
              </button>
            )}

            {/* Save — hidden until the course actually has unsaved changes
                (imported-draft flow), so a course sitting untouched shows no
                dead action. */}
            {role === "INSTRUCTOR" && !isArchived && hasUnsavedChanges && (
              <button
                type="button"
                className="btn shrink-0 rounded-xl border border-border bg-background hover:bg-muted text-foreground text-sm font-bold px-3 py-1.5 transition cursor-pointer disabled:opacity-50"
                onClick={onSaveCourse}
                disabled={isSavingCourse}
                title="Persist current course changes"
              >
                {isSavingCourse ? "Saving..." : "Save"}
              </button>
            )}

            {role === "INSTRUCTOR" && isDraft && onPublishClick && (
              <button
                type="button"
                className="btn shrink-0 rounded-xl bg-primary hover:bg-orange-600 active:scale-95 text-slate-950 font-black text-sm px-3.5 py-1.5 transition shadow-md cursor-pointer"
                onClick={onPublishClick}
              >
                Publish
              </button>
            )}

            {role === "INSTRUCTOR" && isPublished && onUnpublishClick && (
              <button
                type="button"
                className="btn shrink-0 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold text-sm px-3.5 py-1.5 transition cursor-pointer"
                onClick={onUnpublishClick}
              >
                Unpublish
              </button>
            )}

            {role === "INSTRUCTOR" && isArchived && onRestoreClick && (
              <button
                type="button"
                className="btn shrink-0 rounded-xl border border-purple-500/40 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-bold text-sm px-3.5 py-1.5 transition cursor-pointer flex items-center gap-1.5"
                onClick={onRestoreClick}
              >
                <Archive size={13} />
                <span>Restore to Draft</span>
              </button>
            )}

            {role === "INSTRUCTOR" && (
              <button
                className={`btn ${isEditing ? "btn-primary bg-primary text-slate-950" : "btn-outline-primary border border-border text-foreground hover:text-foreground"} rounded-xl px-3 py-1.5 text-sm font-bold transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed`}
                onClick={() => (isEditing ? onSaveCourseMeta?.() : setIsEditing(true))}
                disabled={isEditing && isSaving}
              >
                {isEditing ? (isSaving ? "Saving..." : "Done") : "Edit"}
              </button>
            )}
          </div>
        </div>

        {/* Cell Render Area */}
        <div className="cell-render-area">
          {isEditing ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="cell-field-label block text-[12px] font-black uppercase text-muted-foreground mb-1">Course Title</label>
                  <input
                    type="text"
                    className="cell-input w-full bg-background border border-border rounded-xl px-3 py-2 text-sm font-bold text-foreground outline-none focus:border-primary"
                    id="courseTitleInput"
                    value={courseForm.title || ""}
                    onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="cell-field-label block text-[12px] font-black uppercase text-muted-foreground mb-1">Subtitle</label>
                  <input
                    type="text"
                    className="cell-input w-full bg-background border border-border rounded-xl px-3 py-2 text-sm font-bold text-foreground outline-none focus:border-primary"
                    id="courseSubtitleInput"
                    value={courseForm.subtitle || ""}
                    onChange={(e) => setCourseForm({ ...courseForm, subtitle: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="cell-field-label block text-[12px] font-black uppercase text-muted-foreground mb-1">Abstract</label>
                <textarea
                  className="cell-textarea w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:border-primary resize-none"
                  id="courseAbstractInput"
                  rows={3}
                  value={courseForm.description || ""}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="cell-field-label block text-[12px] font-black uppercase text-muted-foreground mb-1">Author / Instructor</label>
                  <input
                    type="text"
                    className="cell-input w-full bg-background border border-border rounded-xl px-3 py-2 text-sm font-bold text-foreground outline-none focus:border-primary"
                    id="courseAuthorInput"
                    value={courseForm.author || courseForm.instructor || ""}
                    onChange={(e) => setCourseForm({ ...courseForm, author: e.target.value })}
                  />
                </div>
                <div className="form-group space-y-1">
                  <label className="cell-field-label block text-[12px] font-black uppercase text-muted-foreground">Image URL Banner</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      className="cell-input flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm font-mono text-foreground outline-none focus:border-primary"
                      id="courseImageInput"
                      placeholder="https://... or click Upload"
                      value={courseForm.thumbnailUrl || ""}
                      onChange={(e) => setCourseForm({ ...courseForm, thumbnailUrl: e.target.value })}
                    />
                    <UploadButton
                      accept="image/*"
                      onUploadSuccess={(url) => setCourseForm((prev) => ({ ...prev, thumbnailUrl: url }))}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="form-group">
                  <label className="cell-field-label block text-[12px] font-black uppercase text-muted-foreground mb-1">Audience Focus</label>
                  <input
                    type="text"
                    className="cell-input w-full bg-background border border-border rounded-xl px-3 py-2 text-sm font-bold text-foreground outline-none focus:border-primary"
                    id="courseAudienceInput"
                    value={courseForm.audience || ""}
                    onChange={(e) => setCourseForm({ ...courseForm, audience: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="cell-field-label block text-[12px] font-black uppercase text-muted-foreground mb-1">Category</label>
                  <input
                    type="text"
                    className="cell-input w-full bg-background border border-border rounded-xl px-3 py-2 text-sm font-bold text-foreground outline-none focus:border-primary"
                    id="courseCategoryInput"
                    value={courseForm.category || ""}
                    onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="cell-field-label block text-[12px] font-black uppercase text-muted-foreground mb-1">Duration Limit</label>
                  <input
                    type="text"
                    className="cell-input w-full bg-background border border-border rounded-xl px-3 py-2 text-sm font-bold text-foreground outline-none focus:border-primary"
                    id="courseDurationInput"
                    value={courseForm.duration || ""}
                    onChange={(e) => setCourseForm({ ...courseForm, duration: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  className="btn btn-outline-secondary rounded-xl border border-border px-3 py-1.5 text-sm text-foreground"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn rounded-xl bg-primary px-4 py-1.5 text-sm font-black text-slate-950 hover:bg-orange-600"
                  onClick={onSaveCourseMeta}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Done"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className={hideOnMobile}>
                <h3 className="text-2xl font-bold text-foreground">{course?.title || "Untitled Course"}</h3>
                {course?.subtitle && <p className="text-sm font-semibold text-primary italic mt-1">{course.subtitle}</p>}
                <p className="text-sm text-foreground leading-relaxed mt-2">{course?.description || "No description provided."}</p>
              </div>

              {/* Summary Metrics Bar */}
              {(() => {
                const totalLessons = modules.reduce((sum, m) => sum + (m.lessons?.length || 0), 0);
                const totalTopics = modules.reduce(
                  (sum, m) => sum + (m.lessons || []).reduce((tSum, l) => tSum + (l.topics?.length || 0), 0),
                  0
                );
                // Every quiz in the course — module, lesson AND topic level,
                // not just module-level — deduplicated by id so a quiz that
                // somehow appears in more than one list is only counted once.
                const allQuizIds = new Set();
                (course?.quizzes || []).forEach((q) => q?.id && allQuizIds.add(q.id));
                modules.forEach((m) => {
                  (m.quizzes || []).forEach((q) => q?.id && allQuizIds.add(q.id));
                  (m.lessons || []).forEach((l) => {
                    (l.quizzes || []).forEach((q) => q?.id && allQuizIds.add(q.id));
                    (l.topics || []).forEach((t) => {
                      (t.quizzes || []).forEach((q) => q?.id && allQuizIds.add(q.id));
                    });
                  });
                });
                const totalQuizzes = allQuizIds.size;

                return (
                  <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border/80 ${hideOnMobile}`}>
                    <div className="p-3 rounded-xl bg-background/80 border border-border">
                      <span className="text-[12px] font-mono uppercase text-muted-foreground block">Modules</span>
                      <span className="text-lg font-bold text-primary">{modules.length}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-background/80 border border-border">
                      <span className="text-[12px] font-mono uppercase text-muted-foreground block">Lessons</span>
                      <span className="text-lg font-bold text-sky-400">{totalLessons}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-background/80 border border-border">
                      <span className="text-[12px] font-mono uppercase text-muted-foreground block">Topics</span>
                      <span className="text-lg font-bold text-purple-400">{totalTopics}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-background/80 border border-border">
                      <span className="text-[12px] font-mono uppercase text-muted-foreground block">Quizzes</span>
                      <span className="text-lg font-bold text-emerald-400">{totalQuizzes}</span>
                    </div>
                  </div>
                );
              })()}

              <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 pt-1 text-[13px] font-medium text-foreground ${hideOnMobile}`}>
                <div><strong className="text-muted-foreground">Author:</strong> {course?.creator?.name || "LMS Architect"}</div>
                <div><strong className="text-muted-foreground">Category:</strong> {course?.category || "Software Development"}</div>
                <div><strong className="text-muted-foreground">Audience:</strong> {course?.audience || "Developers"}</div>
                <div><strong className="text-muted-foreground">Duration:</strong> {course?.duration || "Self-Paced"}</div>
              </div>

              {/* Course-Level Content Cells */}
              {role === "INSTRUCTOR" && !isDraftMode && (
                <div className="pt-4 border-t border-border/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-foreground">Course Content</h3>
                    <button
                      type="button"
                      onClick={() => setContentAutoOpenSignal((n) => n + 1)}
                      className="text-sm font-bold text-primary hover:text-orange-300 cursor-pointer"
                    >
                      + Add Content
                    </button>
                  </div>
                  <LessonComposerPanel
                    parent={{ parentType: "course", parentId: course?.id }}
                    autoOpenAddSignal={contentAutoOpenSignal}
                    onAutoOpenConsumed={handleContentAutoOpenConsumed}
                    onAddQuiz={onAddQuiz}
                  />
                </div>
              )}

              {/* Course-Level Quizzes (when present) */}
              {Array.isArray(course?.quizzes) && course.quizzes.length > 0 && (
                <div className="pt-4 border-t border-border/80 space-y-3">
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[12px] font-black uppercase">
                      Course Quizzes
                    </span>
                    Course-Level Quizzes ({course.quizzes.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {course.quizzes.map((quiz) => {
                      const qCount = quiz.questions?.length || quiz.quizQuestions?.length || 0;
                      return (
                        <div
                          key={quiz.id || quiz._id || `cq-${quiz.title}`}
                          className="p-3.5 rounded-xl border border-border bg-background/80 hover:border-emerald-500/40 transition space-y-1.5 cursor-pointer"
                          onClick={() => onSelectQuiz?.(quiz, null)}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-sm font-bold text-[#6C7A6D] truncate">{quiz.title}</h4>
                            <span className="text-[12px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono shrink-0">
                              Pass: {quiz.passingScore}%
                            </span>
                          </div>
                          {quiz.description && (
                            <p className="text-[13px] text-muted-foreground line-clamp-2">{quiz.description}</p>
                          )}
                          <div className="flex items-center gap-3 text-[12px] text-muted-foreground font-mono pt-1">
                            <span>{qCount} {qCount === 1 ? "question" : "questions"}</span>
                            {quiz.timeLimit && <span>{quiz.timeLimit} mins</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Modules Header & Compact Card Grid */}
              <div className={`pt-4 border-t border-border/80 space-y-3 ${mobileCompact ? "max-lg:pt-0 max-lg:border-t-0" : ""}`}>
                <div className="flex items-center justify-between">
                  <h3 className={`text-base font-bold text-foreground ${mobileCompact ? "max-lg:text-lg" : ""}`}>
                    Course Modules <span className={hideOnMobile}>({modules.length})</span>
                  </h3>
                  {mobileCompact && (
                    <span className="lg:hidden text-base font-semibold text-muted-foreground">
                      {modules.length} {modules.length === 1 ? "module" : "modules"}
                    </span>
                  )}
                  {onAddModule && (
                    <button
                      type="button"
                      onClick={onAddModule}
                      className="text-sm font-bold text-primary hover:text-orange-300 cursor-pointer"
                    >
                      + Add Module
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {modules.map((mod, mIdx) => {
                    const lessonCount = mod.lessons?.length || 0;
                    const topicCount = (mod.lessons || []).reduce((sum, l) => sum + (l.topics?.length || 0), 0);
                    const quizCount = mod.quizzes?.length || 0;
                    const padIdx = String(mIdx + 1).padStart(2, "0");

                    return (
                      <div
                        key={mod.id}
                        onClick={() => onSelectModule(mod)}
                        className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-background/60 hover:bg-background hover:border-primary/40 cursor-pointer transition"
                      >
                        <div
                          className={`flex items-center gap-3 min-w-0 ${
                            mobileCompact ? "max-lg:items-start" : ""
                          }`}
                        >
                          <span
                            className={`text-sm font-mono font-black text-primary/90 bg-primary/10 px-2 py-1 rounded border border-primary/20 shrink-0 ${
                              mobileCompact
                                ? "max-lg:inline-flex max-lg:h-8 max-lg:w-8 max-lg:items-center max-lg:justify-center max-lg:rounded-lg max-lg:p-0"
                                : ""
                            }`}
                          >
                            {padIdx}
                          </span>
                          <div className="min-w-0">
                            <h4
                              className={`text-sm font-bold text-foreground truncate ${
                                mobileCompact
                                  ? "max-lg:text-base max-lg:leading-snug max-lg:line-clamp-2 max-lg:whitespace-normal"
                                  : ""
                              }`}
                            >
                              {mod.title || "Untitled Module"}
                            </h4>
                            <p
                              className={`text-[12.5px] text-muted-foreground font-mono mt-0.5 ${
                                mobileCompact ? "max-lg:font-sans max-lg:text-[13.5px] max-lg:mt-0.5" : ""
                              }`}
                            >
                              {lessonCount} {lessonCount === 1 ? "Lesson" : "Lessons"} · {topicCount} {topicCount === 1 ? "Topic" : "Topics"}
                              {quizCount > 0 ? ` · ${quizCount} ${quizCount === 1 ? "Quiz" : "Quizzes"}` : ""}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-muted-foreground text-sm font-bold shrink-0 ml-2 ${
                            mobileCompact ? "max-lg:hidden" : ""
                          }`}
                        >
                          →
                        </span>
                        {mobileCompact && (
                          <ChevronRight
                            size={18}
                            className="lg:hidden shrink-0 ml-2 text-muted-foreground"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

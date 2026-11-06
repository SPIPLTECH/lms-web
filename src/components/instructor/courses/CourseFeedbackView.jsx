"use client";

import { useId } from "react";
import { Star, MessageSquareQuote, CheckCircle, TrendingUp, Users, BookOpen } from "lucide-react";
import { useCourseFeedback } from "@/hooks/queries/student/useFeedback";

const CATEGORY_LABELS = [
  { key: "overall", label: "Overall Experience" },
  { key: "contentQuality", label: "Content & Video Quality" },
  { key: "quizzes", label: "Quizzes & Assessments" },
  { key: "assignments", label: "Assignments & Projects" },
  { key: "syllabus", label: "Syllabus & Structure" },
  { key: "teaching", label: "Instructor & Teaching" },
];

function StarRating({ value = 0, max = 5, size = 16, className = "" }) {
  const round = Math.round(value);
  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={
            i < round
              ? "fill-amber-400 text-amber-400"
              : "fill-transparent text-muted-foreground/30"
          }
        />
      ))}
    </div>
  );
}

export default function CourseFeedbackView({ courseId }) {
  const { data, isLoading, error } = useCourseFeedback(courseId);

  const totalReviews = data?.totalReviews || 0;
  const averages = data?.averages || {};
  const reviews = data?.reviews || [];

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <MessageSquareQuote size={18} />
            </div>
            <h3 className="text-base font-bold text-foreground">
              Course Feedback & Student Evaluations
            </h3>
          </div>
          <p className="text-xs text-muted-foreground max-w-xl">
            Detailed 6-category feedback submitted by students who have reached 100% course completion.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background border border-border text-xs font-semibold text-foreground">
          <Users size={14} className="text-primary" />
          <span>{totalReviews} {totalReviews === 1 ? "Review" : "Reviews"}</span>
        </div>
      </div>

      {isLoading && (
        <div className="p-8 text-center text-sm text-muted-foreground">
          Loading course feedback…
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive">
          Could not load course feedback.
        </div>
      )}

      {!isLoading && !error && totalReviews === 0 && (
        <div className="p-8 text-center rounded-xl bg-background/50 border border-border/60 space-y-2">
          <MessageSquareQuote size={36} className="mx-auto text-muted-foreground/40" />
          <h4 className="text-sm font-semibold text-foreground">No Feedback Submitted Yet</h4>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Once enrolled students complete 100% of the course curriculum, they can rate course materials, quizzes, syllabus, and instruction.
          </p>
        </div>
      )}

      {!isLoading && !error && totalReviews > 0 && (
        <div className="space-y-6">
          {/* Top Score Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-background/60 border border-border">
            {/* Primary Score */}
            <div className="flex flex-col items-center justify-center p-3 text-center border-b md:border-b-0 md:border-r border-border/80">
              <span className="text-4xl font-black text-foreground tracking-tight font-mono">
                {averages.overall ? averages.overall.toFixed(1) : "0.0"}
              </span>
              <div className="mt-1">
                <StarRating value={averages.overall || 0} size={18} />
              </div>
              <span className="text-xs text-muted-foreground mt-2 font-medium">
                Overall Course Rating ({totalReviews} {totalReviews === 1 ? "rating" : "ratings"})
              </span>
            </div>

            {/* Category Bars */}
            <div className="md:col-span-2 space-y-2.5 py-1">
              {CATEGORY_LABELS.map(({ key, label }) => {
                const score = averages[key] || 0;
                const percentage = Math.round((score / 5) * 100);
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground font-medium">{label}</span>
                      <span className="font-mono font-bold text-foreground">
                        {score > 0 ? score.toFixed(1) : "—"} / 5.0
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Individual Reviews List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Student Submissions ({reviews.length})
            </h4>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {reviews.map((rev) => {
                const studentName = rev.student?.user?.name || "Enrolled Student";
                const dateStr = rev.createdAt
                  ? new Date(rev.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : "";

                return (
                  <div
                    key={rev.id}
                    className="p-4 rounded-xl bg-background border border-border/80 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary font-mono">
                          {studentName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-foreground">
                            {studentName}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {dateStr}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <StarRating value={rev.overallRating || rev.rating || 0} size={14} />
                        <span className="text-xs font-mono font-bold text-foreground">
                          {(rev.overallRating || rev.rating || 0).toFixed(1)}
                        </span>
                      </div>
                    </div>

                    {/* Breakdown pills */}
                    <div className="flex flex-wrap gap-1.5 text-[10px]">
                      {rev.contentQualityRating && (
                        <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                          Content: {rev.contentQualityRating}★
                        </span>
                      )}
                      {rev.quizzesRating && (
                        <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                          Quizzes: {rev.quizzesRating}★
                        </span>
                      )}
                      {rev.assignmentsRating && (
                        <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                          Assignments: {rev.assignmentsRating}★
                        </span>
                      )}
                      {rev.syllabusRating && (
                        <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                          Syllabus: {rev.syllabusRating}★
                        </span>
                      )}
                      {rev.teachingRating && (
                        <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                          Teaching: {rev.teachingRating}★
                        </span>
                      )}
                    </div>

                    {rev.comment ? (
                      <p className="text-xs text-foreground/90 italic bg-card/60 p-2.5 rounded-lg border border-border/50">
                        "{rev.comment}"
                      </p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground/60 italic">
                        No additional comment provided.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

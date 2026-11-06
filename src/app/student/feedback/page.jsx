"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Send,
  Sparkles,
  Star,
  CheckCircle,
  GraduationCap,
  MessageSquare,
  AlertCircle,
  Loader2,
  BookOpen,
  Check,
} from "lucide-react";
import Link from "next/link";

import Loader from "@/components/common/Loader";
import PageHeader from "@/components/layouts/PageHeader";
import Card from "@/components/ui/Card";
import useCourse from "@/hooks/queries/student/useCourse";
import useMyCourses from "@/hooks/queries/student/useMyCourses";
import { useMyFeedback, useSubmitFeedback } from "@/hooks/queries/student/useFeedback";

function StarRatingInput({ label, value, onChange, description, required = false }) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <div>
          <span className="text-xs font-bold text-foreground flex items-center gap-1">
            {label} {required && <span className="text-primary">*</span>}
          </span>
          {description && (
            <p className="text-[10px] text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {[1, 2, 3, 4, 5].map((star) => {
            const active = star <= (hovered || value);
            return (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => onChange(star)}
                className="p-1 cursor-pointer transition transform hover:scale-115 focus:outline-none"
              >
                <Star
                  size={20}
                  className={
                    active
                      ? "fill-orange-500 text-orange-500"
                      : "text-muted-foreground/30"
                  }
                />
              </button>
            );
          })}
          <span className="text-xs font-black text-muted-foreground min-w-[65px] text-right">
            {value > 0 ? `${value} / 5` : "Select"}
          </span>
        </div>
      </div>
    </div>
  );
}

function ReadOnlyStarRating({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-card/60 border border-border/60 text-xs">
      <span className="font-semibold text-foreground">{label}</span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            size={14}
            className={
              s <= value
                ? "fill-orange-500 text-orange-500"
                : "text-muted-foreground/25"
            }
          />
        ))}
        <span className="text-[11px] font-bold text-muted-foreground ml-1.5">
          {value}/5
        </span>
      </div>
    </div>
  );
}

function CourseFeedbackList({ enrollments = [], isLoading }) {
  if (isLoading) {
    return <Loader />;
  }

  const completedEnrollments = enrollments.filter(
    (e) => e.completed || (e.progressPercent !== undefined && e.progressPercent >= 100)
  );
  const inProgressEnrollments = enrollments.filter(
    (e) => !e.completed && (e.progressPercent === undefined || e.progressPercent < 100)
  );

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16 animate-fade-in duration-300">
      <PageHeader
        title="Course Feedback"
        subtitle="Share your evaluation and help our instructors continually improve curriculum quality."
      />

      {enrollments.length === 0 ? (
        <Card className="p-10 text-center border-dashed border-border/80 bg-card/50 rounded-2xl">
          <BookOpen size={28} className="mx-auto text-muted-foreground mb-3" />
          <h3 className="text-sm font-bold text-foreground">No Enrolled Courses Found</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            Once you enroll in and complete a course, you can evaluate the content, quizzes, and teaching here.
          </p>
          <div className="mt-5">
            <Link
              href="/student/my-courses"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-orange-600 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-sm"
            >
              Go to My Courses
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Completed Courses Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <CheckCircle size={15} className="text-emerald-400" />
              Completed Courses ({completedEnrollments.length})
            </h3>

            {completedEnrollments.length === 0 ? (
              <Card className="p-6 text-center border-border/60 bg-card/40 rounded-2xl">
                <p className="text-xs text-muted-foreground">
                  You haven't completed any courses yet. Feedback unlocks automatically upon 100% course completion.
                </p>
              </Card>
            ) : (
              <div className="grid gap-3">
                {completedEnrollments.map((enr) => {
                  const course = enr.course || {};
                  return (
                    <Card
                      key={enr.id || enr.courseId}
                      className="p-4 sm:p-5 border-border bg-card rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-primary/40 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Completed
                          </span>
                          <h4 className="text-sm font-bold text-foreground">
                            {course.title || "Course"}
                          </h4>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {course.description || "Official curriculum"}
                        </p>
                      </div>

                      <Link
                        href={`/student/feedback?courseId=${enr.courseId || course.id}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-orange-600 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-sm shrink-0"
                      >
                        <MessageSquare size={13} />
                        Provide / View Feedback
                      </Link>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* In-Progress Courses Section */}
          {inProgressEnrollments.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-border/60">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <GraduationCap size={15} />
                Courses in Progress ({inProgressEnrollments.length})
              </h3>
              <div className="grid gap-3">
                {inProgressEnrollments.map((enr) => {
                  const course = enr.course || {};
                  const pct = enr.progressPercent || 0;
                  return (
                    <Card
                      key={enr.id || enr.courseId}
                      className="p-4 border-border/60 bg-card/30 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 opacity-80"
                    >
                      <div className="space-y-1">
                        <h4 className="text-xs font-semibold text-foreground">
                          {course.title || "Course"}
                        </h4>
                        <p className="text-[11px] text-muted-foreground">
                          Progress: {pct}% complete · Feedback opens at 100%
                        </p>
                      </div>
                      <Link
                        href={`/student/learn/${enr.courseId || course.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold rounded-xl transition shrink-0"
                      >
                        Continue Learning
                      </Link>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FeedbackPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId");

  const { data: myCourses = [], isLoading: myCoursesLoading } = useMyCourses();
  const { data: course, isLoading: courseLoading, isError: courseError } = useCourse(courseId);
  const { data: myFeedbackData, isLoading: feedbackLoading } = useMyFeedback(courseId);
  const submitFeedbackMutation = useSubmitFeedback(courseId);

  // Form State: 6 Rating Categories
  const [ratings, setRatings] = useState({
    overallRating: 5,
    contentQualityRating: 5,
    quizzesRating: 5,
    assignmentsRating: 5,
    syllabusRating: 5,
    teachingRating: 5,
  });
  const [comments, setComments] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submittedSuccessfully, setSubmittedSuccessfully] = useState(false);

  // If no courseId is provided in URL, show course selector
  if (!courseId) {
    return <CourseFeedbackList enrollments={myCourses} isLoading={myCoursesLoading} />;
  }

  if (courseLoading || feedbackLoading) {
    return <Loader />;
  }

  if (courseError || !course) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <Card className="p-8 border-border bg-card">
          <AlertCircle size={32} className="mx-auto text-red-500 mb-2" />
          <h2 className="text-lg font-bold text-foreground">Course Not Found</h2>
          <p className="text-xs text-muted-foreground mt-2">
            The feedback page requires a valid enrolled course. Please select a course from your enrolled list.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Link
              href="/student/feedback"
              className="inline-block px-5 py-2.5 bg-primary hover:bg-orange-600 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-sm"
            >
              Select from My Courses
            </Link>
            <Link
              href="/student/my-courses"
              className="inline-block px-5 py-2.5 border border-border bg-card text-foreground font-bold text-xs uppercase tracking-wider rounded-xl transition"
            >
              My Courses
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // CASE 1: Feedback already submitted
  if (myFeedbackData?.feedback) {
    const fb = myFeedbackData.feedback;
    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-16 animate-fade-in duration-300">
        <div>
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary font-bold uppercase tracking-wider transition cursor-pointer"
          >
            <ArrowLeft size={14} />
            Back
          </button>
        </div>

        <PageHeader
          title="Course Feedback"
          subtitle={`Your submitted evaluation for "${course.title || "this course"}".`}
        />

        <Card className="p-6 sm:p-8 border-border bg-card space-y-6 rounded-3xl">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
            <CheckCircle size={22} className="shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Feedback Already Submitted
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Thank you! You submitted your official review on{" "}
                {new Date(fb.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}.
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Your Ratings
            </h4>
            <div className="space-y-2">
              <ReadOnlyStarRating
                label="Overall Course Experience"
                value={fb.overallRating || fb.rating}
              />
              <ReadOnlyStarRating
                label="Content & Video Quality"
                value={fb.contentQualityRating}
              />
              <ReadOnlyStarRating
                label="Quizzes & Self-Tests"
                value={fb.quizzesRating}
              />
              <ReadOnlyStarRating
                label="Assignments & Exercises"
                value={fb.assignmentsRating}
              />
              <ReadOnlyStarRating
                label="Course Syllabus & Structure"
                value={fb.syllabusRating}
              />
              <ReadOnlyStarRating
                label="Instructor & Teaching"
                value={fb.teachingRating}
              />
            </div>
          </div>

          {(fb.comments || fb.review) && (
            <div className="space-y-2 pt-2 border-t border-border">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Your Comments
              </h4>
              <p className="p-4 rounded-2xl bg-muted/30 border border-border text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                "{fb.comments || fb.review}"
              </p>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Link
              href="/student/certificates"
              className="inline-flex items-center justify-center flex-1 px-5 py-3 rounded-2xl bg-primary hover:bg-orange-600 text-slate-950 font-bold text-xs uppercase tracking-wider transition shadow-sm"
            >
              View My Certificates
            </Link>
            <Link
              href={`/student/learn/${courseId}`}
              className="inline-flex items-center justify-center flex-1 px-5 py-3 rounded-2xl border border-border bg-card hover:bg-muted text-foreground font-bold text-xs uppercase tracking-wider transition"
            >
              Review Course
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // CASE 2: Not completed yet
  if (!myFeedbackData?.hasCompletedCourse) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-16 animate-fade-in duration-300">
        <div>
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary font-bold uppercase tracking-wider transition cursor-pointer"
          >
            <ArrowLeft size={14} />
            Back
          </button>
        </div>

        <PageHeader
          title="Course Feedback"
          subtitle={`Share your experience for "${course.title || "this course"}".`}
        />

        <Card className="p-8 border-border bg-card text-center space-y-4 rounded-3xl">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto">
            <GraduationCap size={28} />
          </div>
          <h2 className="text-lg font-bold text-foreground">
            Course Completion Required
          </h2>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            Course feedback is available once you have completed all modules, lessons, quizzes, and assignments of the course.
          </p>
          <div className="inline-block px-4 py-1.5 rounded-full bg-muted border border-border text-xs font-bold text-foreground">
            Current Progress: {myFeedbackData?.progressPercent || 0}%
          </div>
          <div className="pt-4">
            <Link
              href={`/student/learn/${courseId}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-orange-600 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-sm"
            >
              Resume Course Learning
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // CASE 3: Completed and just submitted successfully
  if (submittedSuccessfully) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-16 animate-fade-in duration-300">
        <Card className="p-8 border border-emerald-500/20 bg-emerald-500/5 text-center space-y-4 rounded-3xl">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
            <Sparkles size={28} className="animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-foreground tracking-tight">
            Feedback Submitted!
          </h2>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            Thank you for sharing your thoughtful evaluation. Your input helps our instructors continually refine and elevate the learning experience.
          </p>
          <div className="pt-4 flex justify-center gap-3">
            <Link
              href={`/student/certificates`}
              className="px-5 py-2.5 bg-primary hover:bg-orange-600 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-sm"
            >
              View My Certificates
            </Link>
            <Link
              href="/student/my-courses"
              className="px-5 py-2.5 border border-border bg-card hover:bg-muted text-foreground font-bold text-xs uppercase tracking-wider rounded-xl transition"
            >
              My Courses
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // CASE 4: Eligible to submit feedback
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!ratings.overallRating || ratings.overallRating < 1 || ratings.overallRating > 5) {
      setErrorMessage("Please select an overall rating from 1 to 5.");
      return;
    }

    try {
      await submitFeedbackMutation.mutateAsync({
        overallRating: Number(ratings.overallRating),
        contentQualityRating: Number(ratings.contentQualityRating),
        quizzesRating: Number(ratings.quizzesRating),
        assignmentsRating: Number(ratings.assignmentsRating),
        syllabusRating: Number(ratings.syllabusRating),
        teachingRating: Number(ratings.teachingRating),
        comments: comments.trim() || null,
      });
      setSubmittedSuccessfully(true);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to submit feedback. Please try again.";
      setErrorMessage(msg);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16 animate-fade-in duration-300">
      <div>
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary font-bold uppercase tracking-wider transition cursor-pointer"
        >
          <ArrowLeft size={14} />
          Back to Course Overview
        </button>
      </div>

      <PageHeader
        title="Course Feedback"
        subtitle={`Rate your learning journey in "${course.title || "this course"}".`}
      />

      <Card className="p-6 sm:p-8 border-border bg-card rounded-3xl space-y-6">
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">
              Evaluation Criteria
            </h3>
            <p className="text-xs text-muted-foreground">
              Please rate each aspect of the course from 1 (poor) to 5 (excellent).
            </p>
          </div>

          {/* 1. Overall Rating */}
          <StarRatingInput
            label="1. Overall Course Experience"
            description="Your general satisfaction with the course and learning outcome."
            value={ratings.overallRating}
            onChange={(val) => {
              setErrorMessage("");
              setRatings((prev) => ({ ...prev, overallRating: val }));
            }}
            required
          />

          {/* 2. Content Quality */}
          <StarRatingInput
            label="2. Video & Content Quality"
            description="Clarity of explanations, video production, and learning materials."
            value={ratings.contentQualityRating}
            onChange={(val) => {
              setErrorMessage("");
              setRatings((prev) => ({ ...prev, contentQualityRating: val }));
            }}
          />

          {/* 3. Quizzes */}
          <StarRatingInput
            label="3. Quizzes & Self-Tests"
            description="Relevance and difficulty of knowledge checks and quizzes."
            value={ratings.quizzesRating}
            onChange={(val) => {
              setErrorMessage("");
              setRatings((prev) => ({ ...prev, quizzesRating: val }));
            }}
          />

          {/* 4. Assignments */}
          <StarRatingInput
            label="4. Assignments & Practical Tasks"
            description="Hands-on exercises, homework, and assignment evaluations."
            value={ratings.assignmentsRating}
            onChange={(val) => {
              setErrorMessage("");
              setRatings((prev) => ({ ...prev, assignmentsRating: val }));
            }}
          />

          {/* 5. Syllabus */}
          <StarRatingInput
            label="5. Course Syllabus & Structure"
            description="Logical organization, progressive module flow, and coverage."
            value={ratings.syllabusRating}
            onChange={(val) => {
              setErrorMessage("");
              setRatings((prev) => ({ ...prev, syllabusRating: val }));
            }}
          />

          {/* 6. Teaching & Instructor */}
          <StarRatingInput
            label="6. Instructor & Teaching"
            description="Instructor engagement, guidance, and response quality."
            value={ratings.teachingRating}
            onChange={(val) => {
              setErrorMessage("");
              setRatings((prev) => ({ ...prev, teachingRating: val }));
            }}
          />

          {/* Comments Area */}
          <div className="space-y-2 pt-2 border-t border-border">
            <label className="text-xs font-bold text-foreground block">
              Detailed Comments & Suggestions (Optional)
            </label>
            <textarea
              rows={4}
              maxLength={2000}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="What did you enjoy most? What could be improved for future students?"
              className="w-full rounded-2xl border border-border bg-background p-4 text-xs text-foreground outline-none focus:border-primary transition leading-relaxed resize-none"
            />
            <p className="text-[10px] text-muted-foreground text-right">
              {comments.length} / 2000 characters
            </p>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitFeedbackMutation.isPending}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-primary hover:bg-orange-600 text-slate-950 font-bold uppercase text-xs tracking-wider shadow-sm transition disabled:opacity-50 cursor-pointer border-0"
            >
              {submitFeedbackMutation.isPending ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Submitting Feedback...
                </>
              ) : (
                <>
                  Submit Course Feedback
                  <Send size={14} />
                </>
              )}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <Suspense fallback={<Loader />}>
      <FeedbackPageContent />
    </Suspense>
  );
}

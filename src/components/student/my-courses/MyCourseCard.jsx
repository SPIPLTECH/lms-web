"use client";

import { useRouter } from "next/navigation";
import { BookOpen, User, Eye, ArrowRight, Award } from "lucide-react";

import { getDisplayUrl } from "@/lib/blob";
import { learnHref, courseOverviewHref } from "@/lib/courseSlug";
import useMyCourses from "@/hooks/queries/student/useMyCourses";
import useStudentFeatureAccess from "@/hooks/queries/student/useStudentFeatureAccess";

// Same status-pill colors as the Instructor course card
// (@/components/courses/CourseGridCard) — Not Started stays neutral, every
// "active" enrollment state shares one highlight, Completed is the one
// universal success-green signal.
const STATUS_STYLE = {
  "Not Started": { label: "Not Started", dot: "bg-white/70" },
  Enrolled: { label: "Enrolled", dot: "bg-sky-400" },
  "In Progress": { label: "In Progress", dot: "bg-amber-400" },
  Completed: { label: "Completed", dot: "bg-emerald-400" },
  Expired: { label: "Expired", dot: "bg-red-500" },
};

/** My Courses grid card for students — same banner/badge/meta/footer layout
 *  as the Instructor course card (@/components/courses/CourseGridCard), so
 *  the two sides of the app present courses consistently. Shows the course
 *  image, instructor name, lesson count, and progress, with "View Course"
 *  (details) and "Continue Learning" (resume) as the two footer actions. */
export default function MyCourseCard({ enrollment, course: rawCourse }) {
  const router = useRouter();
  // Cached already on every page that shows course cards.
  const { data: myEnrollments = [] } = useMyCourses();
  // No Certificate button for an SSC Class 10-only student (lib/studentFeatures.js).
  const { showCertificates } = useStudentFeatureAccess();
  const course = enrollment?.course || rawCourse;

  if (!course) return null;

  const isEnrolled = Boolean(enrollment);

  const lessonsTotal = Array.isArray(course.modules)
    ? course.modules.reduce((acc, m) => acc + (Array.isArray(m.lessons) ? m.lessons.length : 0), 0)
    : (course.stats?.lessonsCount ?? course.lessons ?? course._count?.lessons ?? 0);

  // A course with sequential learning off keeps no progress: no percentage,
  // no In Progress / Completed state.
  const tracksProgress = course.sequentialLearning !== false;

  // GET /enrollments returns the stored roll-up as `progressPercent`; `progress`
  // never existed on it, so every card used to read 0%.
  const progress = Math.min(
    100,
    Math.max(0, Math.round(enrollment?.progressPercent ?? enrollment?.progress ?? 0))
  );
  const isExpired = Boolean(
    enrollment?.isExpired ||
    (enrollment?.expiresAt && new Date(enrollment.expiresAt).getTime() <= Date.now())
  );
  const isComplete = isEnrolled && tracksProgress && progress >= 100;
  const status = isEnrolled
    ? isExpired
      ? "Expired"
      : isComplete
        ? "Completed"
        : tracksProgress && progress > 0
          ? "In Progress"
          : "Enrolled"
    : "Not Started";
  const statusStyle = STATUS_STYLE[status] || STATUS_STYLE["Not Started"];

  const instructorName = course.creator?.name;

  const hasStarted = progress > 0;
  const continueLabel = isComplete ? "Review" : tracksProgress ? (hasStarted ? "Continue Learning" : "Start Learning") : "Open Course";
  const continueShortLabel = isComplete ? "Review" : tracksProgress ? (hasStarted ? "Continue" : "Start") : "Open";

  // The learn and course overview pages are addressed by the course's readable key, not its id.
  const learnDestination = learnHref(course, myEnrollments);
  const detailsDestination = courseOverviewHref(course, myEnrollments);
  const feedbackDestination = `/student/feedback?courseId=${course.id}`;
  const primaryDestination = isEnrolled && !isExpired ? learnDestination : detailsDestination;

  const goTo = (path) => (e) => {
    e.stopPropagation();
    router.push(path);
  };

  return (
    <div
      onClick={() => router.push(primaryDestination)}
      className="bg-card group relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
    >
      {/* Flush image wrapper */}
      <div className="relative aspect-video shrink-0 w-full overflow-hidden bg-muted">
        {course.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            // A card is ~320 px wide: ask for a 640 px copy (sharp on 2x
            // screens) rather than the full multi-MB upload.
            src={getDisplayUrl(course.thumbnailUrl, { width: 640 })}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <BookOpen size={28} className="text-muted-foreground/30" />
          </div>
        )}

        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-background px-2.5 py-1 text-[10px] font-bold text-foreground shadow-sm">
            <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
            {statusStyle.label}
          </span>
        </div>

        {isEnrolled && tracksProgress && (
          <div className="absolute top-3 right-3">
            <span className="rounded-full bg-background px-2.5 py-1 text-[10px] font-bold text-foreground shadow-sm">
              {progress}%
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <h3 className="text-[15px] font-semibold leading-tight line-clamp-1 text-foreground mb-1.5">
          {course.title}
        </h3>

        <p className="text-[12px] leading-snug text-muted-foreground line-clamp-2 min-h-[2.25rem] mb-3">
          {course.description || "No description provided."}
        </p>

        {/* No flex-wrap: a long instructor name must truncate, not wrap to a
            second line — otherwise that one card grows taller than its
            siblings in the grid. */}
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground mb-3">
          {instructorName && (
            <>
              <span className="flex items-center gap-1 min-w-0 shrink">
                <User size={12} className="text-muted-foreground/70 shrink-0" />
                <span className="truncate">{instructorName}</span>
              </span>
              <span className="text-muted-foreground/40 text-[10px] shrink-0">●</span>
            </>
          )}
          <span className="flex items-center gap-1 shrink-0">
            <BookOpen size={12} className="text-muted-foreground/70" />
            {lessonsTotal} Lessons
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="rounded-full bg-primary/10 px-2 py-[3px] text-[10px] font-bold text-primary">
            {course.level || "Beginner"}
          </span>
          {isEnrolled && isExpired && (
            <span className="rounded-full bg-red-500/10 px-2 py-[3px] text-[10px] font-bold text-red-400">
              Access Expired
            </span>
          )}
          {isEnrolled && !isExpired && enrollment?.expiresAt && (
            <span className="rounded-full bg-amber-500/10 px-2 py-[3px] text-[10px] font-bold text-amber-500">
              {enrollment.remainingDays !== undefined && enrollment.remainingDays !== null
                ? `${enrollment.remainingDays}d left`
                : `Expires ${new Date(enrollment.expiresAt).toLocaleDateString()}`}
            </span>
          )}
        </div>

        {/* Two peer actions on one row at every width */}
        <div className="mt-auto pt-3 border-t border-border flex items-stretch gap-1.5">
          <button
            onClick={goTo(detailsDestination)}
            aria-label="View Course"
            title="View Course"
            className="inline-flex flex-auto items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-transparent px-2 py-2 min-h-[40px] md:py-1 md:min-h-0 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition"
          >
            <Eye size={11} aria-hidden="true" />
            View Course
          </button>

          {isComplete && showCertificates && (
            <button
              onClick={goTo("/student/certificates")}
              aria-label="View Certificate"
              title="View your official completion certificate"
              className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-2 min-h-[40px] md:py-1 md:min-h-0 text-[11px] font-bold text-amber-400 hover:bg-amber-500/20 transition cursor-pointer"
            >
              <Award size={12} aria-hidden="true" />
              <span>Certificate</span>
            </button>
          )}

          {isEnrolled && (
            isExpired ? (
              <button
                disabled
                aria-label="Access Expired"
                title="Your course access duration + 1 month has ended"
                className="inline-flex flex-auto items-center justify-center gap-1 whitespace-nowrap rounded-md border border-red-500/30 bg-red-500/10 px-2 py-2 min-h-[40px] md:py-1 md:min-h-0 text-[11px] font-bold text-red-400 cursor-not-allowed opacity-80"
              >
                <span>Access Expired</span>
              </button>
            ) : (
              <button
                onClick={goTo(isComplete ? feedbackDestination : learnDestination)}
                aria-label={continueLabel}
                title={continueLabel}
                className="inline-flex flex-auto items-center justify-center gap-1 whitespace-nowrap rounded-md border border-primary/40 bg-transparent px-2 py-2 min-h-[40px] md:py-1 md:min-h-0 text-[11px] font-bold text-primary hover:bg-primary/10 hover:border-primary/60 transition"
              >
                <span className="max-[359px]:hidden">{continueLabel}</span>
                <span className="hidden max-[359px]:inline">{continueShortLabel}</span>
                <ArrowRight size={13} aria-hidden="true" />
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

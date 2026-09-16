"use client";

import { useRouter } from "next/navigation";
import { BookOpen, User, Eye, ArrowRight } from "lucide-react";

import { getDisplayUrl } from "@/lib/blob";

// Same status-pill colors as the Instructor course card
// (@/components/courses/CourseGridCard) — Not Started stays neutral, every
// "active" enrollment state shares one highlight, Completed is the one
// universal success-green signal.
const STATUS_STYLE = {
  "Not Started": { label: "Not Started", dot: "bg-white/70" },
  Enrolled: { label: "Enrolled", dot: "bg-sky-400" },
  "In Progress": { label: "In Progress", dot: "bg-amber-400" },
  Completed: { label: "Completed", dot: "bg-emerald-400" },
};

/** My Courses grid card for students — same banner/badge/meta/footer layout
 *  as the Instructor course card (@/components/courses/CourseGridCard), so
 *  the two sides of the app present courses consistently. Shows the course
 *  image, instructor name, lesson count, and progress, with "View Course"
 *  (details) and "Continue Learning" (resume) as the two footer actions. */
export default function MyCourseCard({ enrollment, course: rawCourse }) {
  const router = useRouter();
  const course = enrollment?.course || rawCourse;

  if (!course) return null;

  const isEnrolled = Boolean(enrollment);

  const lessonsTotal = Array.isArray(course.modules)
    ? course.modules.reduce((acc, m) => acc + (Array.isArray(m.lessons) ? m.lessons.length : 0), 0)
    : (course.stats?.lessonsCount ?? course.lessons ?? course._count?.lessons ?? 0);

  // GET /enrollments returns the stored roll-up as `progressPercent`; `progress`
  // never existed on it, so every card used to read 0%.
  const progress = Math.min(
    100,
    Math.max(0, Math.round(enrollment?.progressPercent ?? enrollment?.progress ?? 0))
  );
  const isComplete = isEnrolled && progress >= 100;
  const status = isEnrolled ? (isComplete ? "Completed" : progress > 0 ? "In Progress" : "Enrolled") : "Not Started";
  const statusStyle = STATUS_STYLE[status];

  const instructorName = course.creator?.name;

  const continueLabel = isComplete ? "Review" : "Continue Learning";

  const learnDestination = `/student/learn/${course.id}`;
  const detailsDestination = `/student/courses/${course.id}`;
  const feedbackDestination = `/student/feedback?courseId=${course.id}`;
  const primaryDestination = isEnrolled ? learnDestination : detailsDestination;

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
            src={getDisplayUrl(course.thumbnailUrl)}
            alt=""
            loading="lazy"
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

        {isEnrolled && (
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
        </div>

        {/* Two peer actions on one row at every width: a neutral outline for
            details, a primary-tinted one for resuming. Below md the card rides
            in a px-[6%] snap carousel, which leaves only ~216px for this row at
            320px — 26px short of the two full labels, so they used to wrap and
            the pair stopped looking like a pair. The resume label therefore
            drops to its short form under 360px, which lets nowrap apply at
            every width. Touch height is raised below md as well: py-1 with
            11px text is a ~23px target, well under the 44px minimum. */}
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

          {isEnrolled && (
            <button
              onClick={goTo(isComplete ? feedbackDestination : learnDestination)}
              aria-label={continueLabel}
              title={continueLabel}
              className="inline-flex flex-auto items-center justify-center gap-1 whitespace-nowrap rounded-md border border-primary/40 bg-transparent px-2 py-2 min-h-[40px] md:py-1 md:min-h-0 text-[11px] font-bold text-primary hover:bg-primary/10 hover:border-primary/60 transition"
            >
              <span className="max-[359px]:hidden">{continueLabel}</span>
              <span className="hidden max-[359px]:inline">{isComplete ? "Review" : "Continue"}</span>
              <ArrowRight size={13} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

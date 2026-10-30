"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, GraduationCap } from "lucide-react";

import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import Pagination from "@/components/ui/Pagination";
import SnapCardSlider from "@/components/ui/SnapCardSlider";
import MyCourseCard from "@/components/student/my-courses/MyCourseCard";
import StudentWelcomeCard from "@/components/student/my-courses/StudentWelcomeCard";
import GettingStartedChecklist from "@/components/student/onboarding/GettingStartedChecklist";
import MotivationCard from "@/components/student/dashboard/MotivationCard";
import StudyPlanCard from "@/components/student/dashboard/StudyPlanCard";
import CareerReadinessCard from "@/components/student/dashboard/CareerReadinessCard";
import { courseIdOf, sortByRecentAccess } from "@/lib/studentOnboarding";
import useMyCourses from "@/hooks/queries/student/useMyCourses";
import { AiAssistantWidget } from "@/features/ai-assistant/components";

export default function MyCoursesPage() {
  const { data: myEnrollments = [], isLoading, isError, refetch } = useMyCourses();

  const [yearFilter, setYearFilter] = useState("all");

  // Sort enrollments strictly by student's actual course access (lastAccessedAt desc).
  // Accessed courses (lastAccessedAt exists) come first in order of recency.
  // Never-accessed courses fall back to enrolledAt desc. Shared with the
  // onboarding tour, which opens this same first course.
  const sortedEnrollments = useMemo(() => sortByRecentAccess(myEnrollments), [myEnrollments]);

  const primaryCourse = sortedEnrollments[0];
  const primaryCourseId = courseIdOf(primaryCourse);
  const primaryCourseTitle = primaryCourse?.course?.title || null;

  // Years the student has an enrollment in, newest first — drives the Year filter.
  const enrollmentYears = useMemo(() => {
    const years = new Set(
      myEnrollments
        .map((e) => (e.enrolledAt ? new Date(e.enrolledAt).getFullYear() : null))
        .filter(Boolean)
    );
    return Array.from(years).sort((a, b) => b - a);
  }, [myEnrollments]);

  const yearFilteredEnrollments = useMemo(() => {
    if (yearFilter === "all") return sortedEnrollments;
    return sortedEnrollments.filter(
      (e) => e.enrolledAt && new Date(e.enrolledAt).getFullYear() === Number(yearFilter)
    );
  }, [sortedEnrollments, yearFilter]);

  // `/enrollments` returns everything at once (no server-side pagination), so
  // paging happens client-side over the year-filtered list — same
  // Pagination component the Instructor Courses page uses, just fed a local
  // slice instead of a server page.
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const totalPages = Math.max(1, Math.ceil(yearFilteredEnrollments.length / limit));
  const pagedEnrollments = yearFilteredEnrollments.slice((page - 1) * limit, page * limit);

  // Snap back to the last valid page if the Year filter or an unenroll
  // shrinks the list out from under the current page.
  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  return (
    // Same shell as the Instructor Courses page: bleeds out to DashboardLayout's
    // padding (p-2 / sm:p-6 / md:p-16) and re-pads evenly; the page scrolls as
    // a normal document, the Enrolled Courses grid does not scroll on its own.
    <div className="-m-2 sm:-m-6 md:-m-16 p-3 sm:p-6 space-y-4 md:space-y-6 flex flex-col flex-1 min-h-0">
      <div className="shrink-0">
        <StudentWelcomeCard courseTitle={primaryCourseTitle} />
      </div>

      {/* New students only (renders nothing otherwise). */}
      <div className="shrink-0 empty:hidden">
        <GettingStartedChecklist />
      </div>

      {/* Adaptive agents. Each card renders nothing until it has something to
          say, and nothing on an error, so the row disappears entirely when
          the agents have no data. KEEP GOING: streak and a few timely nudges.
          STUDY PLAN: this week's plan for the most recently opened course.
          CAREER READINESS: readiness for the student's chosen role. */}
      <div className="shrink-0 grid gap-4 lg:grid-cols-3 items-start empty:hidden">
        <MotivationCard />
        {primaryCourseId && <StudyPlanCard courseId={primaryCourseId} courseTitle={primaryCourseTitle} />}
        <CareerReadinessCard />
      </div>

      {isError ? (
        <div className="rounded-2xl border border-border bg-card py-16 text-center space-y-3">
          <p className="text-sm font-bold text-foreground">Unable to load your courses.</p>
          <Button onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : !isLoading && myEnrollments.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No Enrolled Courses Yet"
          description="Courses you purchase will appear here once your enrollment is active."
        />
      ) : (
        <div className="flex flex-col flex-1 min-h-0 rounded-2xl border border-border bg-card px-3 py-4 md:px-12 md:py-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-4 mb-4 md:mb-6 shrink-0">
            <div className="flex items-center gap-2">
              <GraduationCap size={18} className="text-primary" />
              <h2 className="text-base sm:text-lg font-bold text-foreground">Enrolled Courses</h2>
            </div>

            {enrollmentYears.length > 0 && (
              <select
                value={yearFilter}
                onChange={(e) => {
                  setYearFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-border bg-card px-3 py-2 md:py-2.5 text-xs font-semibold text-foreground outline-none cursor-pointer hover:border-transparent transition [&>option]:bg-card [&>option]:text-foreground shrink-0"
              >
                <option value="all">All Years</option>
                {enrollmentYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex-1">
            <SnapCardSlider
              items={pagedEnrollments}
              getKey={(enrollment) => enrollment.id || enrollment.courseId}
              renderItem={(enrollment) => <MyCourseCard enrollment={enrollment} />}
              gridClassName="md:justify-items-center md:mx-auto md:max-w-[1328px] md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              itemClassName="md:max-w-[320px]"
              isLoading={isLoading}
              skeletonCount={6}
              skeleton={
                <div className="h-72 md:h-72 rounded-2xl border border-slate-200 bg-white/10 animate-pulse" />
              }
              emptyState={<EmptyState title="No courses enrolled in the selected year." />}
              dotsLabel="Course slides"
              getDotLabel={(_, i) => `Go to course slide ${i + 1}`}
            />
          </div>

          {/* Under the grid, with clear space above it. */}
          {!isLoading && myEnrollments.length > 0 && (
            <div className="hidden md:block shrink-0 mt-6">
              <Pagination
                page={page}
                totalPages={totalPages}
                total={yearFilteredEnrollments.length}
                limit={limit}
                onPageChange={setPage}
                onLimitChange={(next) => {
                  setLimit(next);
                  setPage(1);
                }}
              />
            </div>
          )}
        </div>
      )}

      <AiAssistantWidget
        courseId={primaryCourseId}
        courseTitle={primaryCourseTitle}
        isEnrolled={Boolean(primaryCourseId)}
        scopeHint="ENROLLED"
        hideLauncherBelowSm
      />
    </div>
  );
}

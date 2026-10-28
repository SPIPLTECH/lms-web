"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, GraduationCap } from "lucide-react";

import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import Pagination from "@/components/ui/Pagination";
import SnapCardSlider from "@/components/ui/SnapCardSlider";
import MyCourseCard from "@/components/student/my-courses/MyCourseCard";
import StudentWelcomeCard from "@/components/student/my-courses/StudentWelcomeCard";
import useMyCourses from "@/hooks/queries/student/useMyCourses";
import { AiAssistantWidget } from "@/features/ai-assistant/components";

export default function MyCoursesPage() {
  const { data: myEnrollments = [], isLoading, isError, refetch } = useMyCourses();

  const [yearFilter, setYearFilter] = useState("all");

  // Sort enrollments strictly by student's actual course access (lastAccessedAt desc).
  // Accessed courses (lastAccessedAt exists) come first in order of recency.
  // Never-accessed courses fall back to enrolledAt desc.
  const sortedEnrollments = useMemo(() => {
    return [...myEnrollments].sort((a, b) => {
      const timeA = a.lastAccessedAt ? new Date(a.lastAccessedAt).getTime() : 0;
      const timeB = b.lastAccessedAt ? new Date(b.lastAccessedAt).getTime() : 0;

      if (timeA !== timeB) {
        return timeB - timeA;
      }

      const enrollA = a.enrolledAt ? new Date(a.enrolledAt).getTime() : 0;
      const enrollB = b.enrolledAt ? new Date(b.enrolledAt).getTime() : 0;
      return enrollB - enrollA;
    });
  }, [myEnrollments]);

  const primaryCourse = sortedEnrollments[0];
  const primaryCourseId = primaryCourse?.courseId || primaryCourse?.course?.id || null;
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
    // student/layout.jsx gives this route a viewport-height shell, so the
    // page fills a definite height: the welcome card keeps its size, the
    // Enrolled Courses card takes the rest, and the course card's thumbnail
    // shrinks to fit (MyCourseCard) — no page scroll, no grid scroll.
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <div className="shrink-0">
        <StudentWelcomeCard />
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
          {/* One row at every width (title left, year filter right): stacked
              on a phone it cost ~44px the course card needs to fit. */}
          <div className="flex flex-row items-center justify-between gap-2 md:gap-4 mb-4 shrink-0">
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

          {/* The height left for the cards, handed down: the slider row (or
              the md+ grid rows) fill it, each item is a column the card is
              capped to, and MyCourseCard's thumbnail shrinks when the card
              would not fit. Rows never go below a card's smallest size.
              md:w-full: with mx-auto in this flex column the grid would
              shrink to its content, and the empty loading skeletons have
              none — every 1fr column collapsed to 0px, leaving only each
              skeleton's borders on screen as thin vertical lines. */}
          <div className="flex flex-1 min-h-0 flex-col">
            <SnapCardSlider
              items={pagedEnrollments}
              getKey={(enrollment) => enrollment.id || enrollment.courseId}
              renderItem={(enrollment) => <MyCourseCard enrollment={enrollment} />}
              gridClassName="flex-1 min-h-0 md:auto-rows-[minmax(16rem,1fr)] md:justify-items-center md:mx-auto md:w-full md:max-w-[1328px] md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              itemClassName="flex flex-col md:max-w-[320px]"
              isLoading={isLoading}
              skeletonCount={6}
              skeleton={
                <div className="h-full min-h-64 w-full rounded-2xl border border-border bg-muted animate-pulse" />
              }
              emptyState={<EmptyState title="No courses enrolled in the selected year." />}
              dotsLabel="Course slides"
              getDotLabel={(_, i) => `Go to course slide ${i + 1}`}
            />
          </div>

          {/* Under the grid, with clear space above it. */}
          {!isLoading && myEnrollments.length > 0 && (
            <div className="hidden md:block shrink-0 mt-4">
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

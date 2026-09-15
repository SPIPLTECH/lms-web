"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, GraduationCap } from "lucide-react";

import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import Pagination from "@/components/ui/Pagination";
import SnapCardSlider from "@/components/ui/SnapCardSlider";
import MyCourseCard from "@/components/student/my-courses/MyCourseCard";
import StudentWelcomeCard from "@/components/student/my-courses/StudentWelcomeCard";
import useMyCourses from "@/hooks/queries/student/useMyCourses";

export default function MyCoursesPage() {
  const router = useRouter();
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
    <div
      // Bleeds exactly to the layout's own padding (p-2 / sm:p-6 / md:p-16);
      // -mx-4 on phones overshot it by 8px and scrolled the page sideways.
      // pt-3 below sm so the greeting clears the sticky navbar it bleeds under.
      className="-m-3 sm:-m-6 -mt-4 sm:-mt-6 md:-mt-16 -mx-2 sm:-mx-6 md:-mx-16 -mb-8 sm:-mb-12 md:-mb-16 p-3 sm:p-6 pt-3 sm:pt-0 space-y-4 md:space-y-6 flex flex-col flex-1 min-h-0">
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
          description="Browse the course catalog and start learning today."
          actionText="Browse Courses"
          onAction={() => router.push("/student/courses")}
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

          <div className="md:flex-1 md:min-h-0 md:overflow-y-auto md:pr-1 md:-mr-1">
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

            {!isLoading && myEnrollments.length > 0 && (
              <div className="hidden md:block">
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
        </div>
      )}
    </div>
  );
}

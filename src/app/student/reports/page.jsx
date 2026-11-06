"use client";

import { useMemo, useState } from "react";
import { ClipboardCheck, ClipboardList, Medal } from "lucide-react";

import Loader from "@/components/common/Loader";
import PageHeader from "@/components/layouts/PageHeader";

import ReportsTabStrip from "@/components/student/reports/ReportsTabStrip";
import ReportFilters from "@/components/student/reports/ReportFilters";
import ReportSummaryCard from "@/components/student/reports/ReportSummaryCard";
import ReportsEmptyState from "@/components/student/reports/ReportsEmptyState";

import useDashboard from "@/hooks/queries/student/useDashboard";
import useQuizzes from "@/hooks/queries/student/useQuizzes";
import useAssignments from "@/hooks/queries/student/useAssignments";
import useCertificates from "@/hooks/queries/student/useCertificates";
import { normalizeAssignmentStatus } from "@/features/student/constants/assignmentsConfig";
import useStudentFeatureAccess from "@/hooks/queries/student/useStudentFeatureAccess";

export default function StudentReportsPage() {
  // No Assignment or Certificate summary for an SSC Class 10-only student
  // (lib/studentFeatures.js).
  const { showSubmissions, showCertificates } = useStudentFeatureAccess();
  const [selectedCourseId, setSelectedCourseId] = useState("all");
  const [timeRange, setTimeRange] = useState("All Time");

  const { data: dashboardData, isLoading: dashboardLoading } = useDashboard();
  const enrolledCourses = dashboardData?.enrolledCoursesList ?? [];
  const courses = useMemo(
    () => enrolledCourses.map((e) => ({ id: e.courseId, title: e.course?.title })),
    [enrolledCourses]
  );
  const selectedCourse =
    selectedCourseId !== "all" ? courses.find((c) => c.id === selectedCourseId) : null;

  const { data: quizzes = [], isLoading: quizzesLoading } = useQuizzes(
    selectedCourse ? selectedCourse.id : undefined
  );
  const { data: assignments = [], isLoading: assignmentsLoading } = useAssignments();
  const { data: certificates = [], isLoading: certificatesLoading } = useCertificates();

  const filteredAssignments = useMemo(() => {
    if (!selectedCourse) return assignments;
    return assignments.filter((a) => (a.course?.title || a.courseTitle) === selectedCourse.title);
  }, [assignments, selectedCourse]);

  const filteredCertificates = useMemo(() => {
    if (!selectedCourse) return certificates;
    return certificates.filter((c) => c.course?.title === selectedCourse.title);
  }, [certificates, selectedCourse]);

  if (dashboardLoading) {
    return <Loader />;
  }

  const hasEnrolledCourses = enrolledCourses.length > 0;

  const attemptedQuizzes = quizzes.filter((q) => !!q.quizSubmissions?.[0]);
  const passedQuizzes = attemptedQuizzes.filter((q) => q.quizSubmissions[0].passed);
  const avgQuizPercentage = attemptedQuizzes.length
    ? Math.round(
        attemptedQuizzes.reduce((sum, q) => sum + (q.quizSubmissions[0].percentage ?? 0), 0) /
          attemptedQuizzes.length
      )
    : 0;

  const assignmentBuckets = {
    Graded: filteredAssignments.filter((a) => normalizeAssignmentStatus(a) === "Graded").length,
    Pending: filteredAssignments.filter((a) => {
      const status = normalizeAssignmentStatus(a);
      return status !== "Submitted" && status !== "Graded";
    }).length,
  };

  return (
    <div className="space-y-4 pb-16">
      <PageHeader title="Reports" subtitle="Your grades, quiz performance, and assignments at a glance." />

      <ReportsTabStrip />

      {!hasEnrolledCourses ? (
        <ReportsEmptyState />
      ) : (
        <>
          <ReportFilters
            courses={courses}
            selectedCourseId={selectedCourseId}
            onCourseChange={setSelectedCourseId}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
          />

          <div className="space-y-2">
            <ReportSummaryCard
              icon={ClipboardCheck}
              title="Quiz Performance"
              href="/student/quizzes"
              primaryText={
                quizzesLoading
                  ? "Loading quiz results…"
                  : attemptedQuizzes.length === 0
                    ? "No quizzes attempted yet."
                    : `${avgQuizPercentage}% Average Score`
              }
              secondaryText={
                !quizzesLoading && attemptedQuizzes.length > 0
                  ? `${passedQuizzes.length}/${attemptedQuizzes.length} Passed`
                  : undefined
              }
            />

            {showSubmissions && (
              <ReportSummaryCard
                icon={ClipboardList}
                title="Assignment Summary"
                href="/student/assignments"
                primaryText={
                  assignmentsLoading
                    ? "Loading assignments…"
                    : filteredAssignments.length === 0
                      ? "No assignments yet."
                      : `${assignmentBuckets.Pending} Pending • ${assignmentBuckets.Graded} Graded`
                }
                secondaryText={
                  !assignmentsLoading && filteredAssignments.length > 0
                    ? `${filteredAssignments.length} Total`
                    : undefined
                }
              />
            )}

            {showCertificates && (
              <ReportSummaryCard
                icon={Medal}
                title="Certificate Summary"
                href="/student/certificates"
                primaryText={
                  certificatesLoading
                    ? "Loading certificates…"
                    : filteredCertificates.length === 0
                      ? "No certificates earned yet."
                      : `${filteredCertificates.length} Certificate${filteredCertificates.length > 1 ? "s" : ""} Earned`
                }
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

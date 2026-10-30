"use client";

import { ClipboardCheck } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useDashboard } from "@/hooks/queries/admin/useDashboard";
import {
  useAdminReviewQueue,
  useRecentActivity,
} from "@/hooks/queries/admin/useDashboardHome";

import Loader from "@/components/common/Loader";

import { HomeHeader } from "@/components/dashboard/HomeHeader";
import { AttentionList } from "@/components/dashboard/AttentionList";
import { AdminKPIs } from "@/components/admin/dashboard/AdminKPIs";
import { CoursePerformanceTable } from "@/components/admin/dashboard/CoursePerformanceTable";
import { RecentActivityFeed } from "@/components/admin/dashboard/RecentActivityFeed";
import { TodaySnapshot } from "@/components/admin/dashboard/TodaySnapshot";
import RecentUsers from "@/components/dashboard/RecentUsers";

/**
 * Admin Home.
 *
 * An admin's remit on this platform is narrow and specific (see CLAUDE.md §8):
 * they review courses, publish / unpublish / archive them, and set pricing.
 * Instructors are explicitly forbidden from all of that. So the queue of
 * courses waiting on an admin decision is the page, and it leads.
 *
 * Ordered as: who you are and what today holds -> the four platform numbers,
 * each linking somewhere -> what is waiting on a decision -> today's movement,
 * who just signed up, what just happened -> how courses are performing.
 *
 * Deliberately absent:
 *  - The published-vs-draft donut. Two categories is not a chart, and both
 *    numbers are already stated elsewhere on the page.
 *  - "Top performing instructor". A leaderboard of exactly one person, ranked
 *    by raw enrollment count — which rewards whoever owns the biggest course
 *    rather than measuring performance. The Instructors screen ranks properly.
 */
export default function AdminDashboard() {
  const { user } = useAuth();
  const { data: dashboard, isLoading, isError } = useDashboard();

  const reviewQueue = useAdminReviewQueue();
  const recentActivity = useRecentActivity();

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader />
      </div>
    );
  }

  if (isError || !dashboard) {
    return (
      <div className="py-24 text-center text-sm text-destructive">
        Failed to load the dashboard. Refresh to try again.
      </div>
    );
  }

  const pendingDecisions = reviewQueue.data.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="flex flex-col gap-6 py-2">
      <HomeHeader
        name={user?.name}
        summary={[
          pendingDecisions > 0
            ? `${pendingDecisions} awaiting a decision`
            : "",
          dashboard.trends?.newUsersToday > 0
            ? `${dashboard.trends.newUsersToday} new today`
            : "",
          dashboard.blockedUsers > 0
            ? `${dashboard.blockedUsers} blocked`
            : "",
        ]}
        actionLabel="Review courses"
        actionHref="/admin/courses"
        actionIcon={ClipboardCheck}
      />

      <AdminKPIs
        coursesCount={dashboard.totalCourses}
        studentsCount={dashboard.totalStudents}
        instructorsCount={dashboard.totalInstructors}
        enrollmentsCount={dashboard.totalEnrollments}
        trends={dashboard.trends}
      />

      <AttentionList
        items={reviewQueue.data}
        isLoading={reviewQueue.isLoading}
        emptyTitle="Nothing is waiting on you"
        emptyDescription="Every published course is priced and has content, and no drafts are pending review."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <TodaySnapshot snapshot={dashboard.todaySnapshot} />
        <RecentUsers users={dashboard.recentUsers} />
        <RecentActivityFeed activity={recentActivity.data} isLoading={recentActivity.isLoading} />
      </div>

      <CoursePerformanceTable courses={dashboard.coursePerformance} />
    </div>
  );
}

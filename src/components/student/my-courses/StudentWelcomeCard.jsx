"use client";

import { BookOpen, CheckCircle, BarChart3 } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import WelcomeBanner from "@/components/common/WelcomeBanner";
import useMyCourses from "@/hooks/queries/student/useMyCourses";

/**
 * The greeting banner at the top of Student > My Courses — same shell as
 * Instructor > My Courses' InstructorWelcomeCard, now with the equivalent
 * stat tiles so both banners render at the same size. `useMyCourses()` is
 * the same query the page itself calls (QUERY_KEYS.MY_COURSES), so this
 * reads from cache rather than firing a second request.
 */
export default function StudentWelcomeCard() {
  const { user } = useAuth();
  const { data: myEnrollments = [], isLoading } = useMyCourses();
  const firstName = user?.name ? user.name.trim().split(/\s+/)[0] : "Student";

  const completedCount = myEnrollments.filter(
    (e) => Math.round(e.progressPercent ?? e.progress ?? 0) >= 100
  ).length;

  const lessonsTotal = myEnrollments.reduce((acc, e) => {
    const course = e.course || {};
    const count = Array.isArray(course.modules)
      ? course.modules.reduce((sum, m) => sum + (Array.isArray(m.lessons) ? m.lessons.length : 0), 0)
      : (course.stats?.lessonsCount ?? course.lessons ?? course._count?.lessons ?? 0);
    return acc + count;
  }, 0);

  const stats = [
    { label: "Enrolled", value: myEnrollments.length, icon: BookOpen },
    { label: "Completed", value: completedCount, icon: CheckCircle },
    { label: "Lessons", value: lessonsTotal, icon: BarChart3 },
  ];

  return (
    <WelcomeBanner
      name={firstName}
      subtitle="Keep up the great work. Pick a course to continue learning."
      stats={stats}
      isLoading={isLoading}
    />
  );
}

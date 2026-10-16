"use client";

import { useAuth } from "@/context/AuthContext";
import WelcomeBanner from "@/components/common/WelcomeBanner";

/**
 * The greeting banner at the top of Instructor > My Courses — same shell as
 * Student > My Courses' StudentWelcomeCard: greeting only, no stat tiles.
 * WelcomeBanner lays itself out without them when `stats` is omitted.
 *
 * The Courses/Students/Lessons totals that used to sit here were removed; the
 * banner is a greeting, and the page below it is the course grid itself. The
 * server-computed figures remain available via `useCourseStatusCounts`
 * (GET /courses/stats/mine) if they are ever wanted somewhere they earn their
 * place — note they must come from that endpoint rather than from summing this
 * page's course list, which is paginated at 12 and would under-report.
 */
export default function InstructorWelcomeCard() {
  const { user } = useAuth();
  const firstName = user?.name ? user.name.trim().split(/\s+/)[0] : "Instructor";

  return (
    <WelcomeBanner
      name={firstName}
      subtitle="Keep creating amazing learning experiences. Pick a course to continue building."
      imageSrc="/images/instructor_3d.jpg"
    />
  );
}

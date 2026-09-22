"use client";

import { useAuth } from "@/context/AuthContext";
import WelcomeBanner from "@/components/common/WelcomeBanner";

/**
 * The greeting banner at the top of Instructor > My Courses.
 *
 * Distinct from `HomeHeader`, which is deliberately prose-only. Greeting only:
 * the three totals (Courses / Students / Lessons) were dropped, and with them
 * the GET /courses/stats/mine request that fetched them.
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

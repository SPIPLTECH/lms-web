"use client";

import { useAuth } from "@/context/AuthContext";
import WelcomeBanner from "@/components/common/WelcomeBanner";

/**
 * The greeting banner at the top of Student > My Courses — same shell as
 * Instructor > My Courses' InstructorWelcomeCard. Greeting only: the stat
 * tiles (Enrolled / Completed / Lessons) were dropped, and with them the
 * enrollment query that existed solely to count them.
 */
export default function StudentWelcomeCard() {
  const { user } = useAuth();
  const firstName = user?.name ? user.name.trim().split(/\s+/)[0] : "Student";

  return (
    <WelcomeBanner
      name={firstName}
      subtitle="Keep up the great work. Pick a course to continue learning."
    />
  );
}

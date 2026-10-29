"use client";

import { Compass, ShieldCheck } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useStudentTour } from "@/context/StudentTourContext";
import useCompleteOnboarding from "@/hooks/queries/student/useCompleteOnboarding";
import { needsOnboarding } from "@/lib/studentOnboarding";
import WelcomeBanner from "@/components/common/WelcomeBanner";
import Button from "@/components/ui/Button";

// Shown the same way as the Instructor welcome banner's illustration.
const WELCOME_IMAGE = "/images/student_welcome.jpg";

/**
 * The greeting banner at the top of Student > My Courses — same shell as
 * Instructor > My Courses' InstructorWelcomeCard, but greeting only: the
 * student banner deliberately shows no stat tiles, and WelcomeBanner lays
 * itself out without them when `stats` is omitted.
 *
 * A new student (needsOnboarding) with a course to open gets the onboarding
 * variant instead: what they're enrolled in, the tour, and "Not now", which
 * records onboarding as done so the banner and Getting started go away.
 */
export default function StudentWelcomeCard({ courseTitle = null }) {
  const { user } = useAuth();
  const tour = useStudentTour();
  const completeOnboarding = useCompleteOnboarding();
  const firstName = user?.name ? user.name.trim().split(/\s+/)[0] : "Student";

  if (needsOnboarding(user) && tour.canStart) {
    return (
      <WelcomeBanner
        eyebrow="New here"
        title={`Welcome, ${firstName}`}
        subtitle={`You're enrolled in ${courseTitle || "your course"}. Take a one-minute tour of the learning page before you start.`}
        imageSrc={WELCOME_IMAGE}
        compactWhenShort
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => tour.start()} className="inline-flex items-center gap-2">
            <Compass size={16} aria-hidden="true" /> Take the tour
          </Button>
          <Button
            variant="ghost"
            onClick={() => (tour.skip ? tour.skip() : completeOnboarding.mutate())}
            disabled={completeOnboarding.isPending}
          >
            Not now
          </Button>
          <span className="flex items-center gap-1.5 text-xs text-success">
            <ShieldCheck size={14} aria-hidden="true" /> The tour doesn&apos;t change your progress or play any video.
          </span>
        </div>
      </WelcomeBanner>
    );
  }

  return (
    <WelcomeBanner
      name={firstName}
      subtitle="Keep up the great work. Pick a course to continue learning."
      imageSrc={WELCOME_IMAGE}
    />
  );
}

"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";

import Loader from "@/components/common/Loader";
import EmptyState from "@/components/ui/EmptyState";
import CourseQuestMap from "@/components/student/course-details/CourseQuestMap";
import useStudentCoursePage from "@/hooks/queries/student/useStudentCoursePage";

/**
 * The course map for an enrolled student (see CourseQuestMap), reached from
 * the course details page. Same enrolment guard and data as that page
 * (useStudentCoursePage).
 */
export default function CourseMapPage({ params }) {
  const { courseId } = use(params);
  const router = useRouter();
  const { status, course, sequence, learnPath, actionLabel, hasNoContent } = useStudentCoursePage(courseId);

  if (status === "loading") return <Loader />;
  if (status === "error") {
    return (
      <EmptyState
        icon={BookOpen}
        title="Course not found"
        description="The requested course could not be loaded."
      />
    );
  }

  // The map fills the screen under the navbar: it bleeds out of the student
  // layout's <main> padding (p-2 / sm:p-6 / md:p-16, pb-32) and takes the
  // viewport's height, less the navbar and, on phones, the bottom tab bar.
  return (
    <div className="-m-2 -mb-32 sm:-m-6 sm:-mb-32 md:-m-16 md:-mb-32 animate-fade-in duration-300">
      <div className="h-[calc(100dvh-65px-56px)] min-h-[480px] sm:h-[calc(100dvh-65px)]">
        <CourseQuestMap
          course={course}
          sequence={sequence}
          actionLabel={actionLabel}
          hasNoContent={hasNoContent}
          onBack={() => router.push(`/student/courses/${courseId}`)}
          // No ?item= — the player lands on the server's resume step.
          onContinue={() => router.push(learnPath)}
          // A topic opens at its first open step; the map only offers topics
          // the sequence says are open, and the player still falls back to
          // the current step if a lock changed in between.
          onOpenItem={(itemId) => router.push(`${learnPath}?item=${encodeURIComponent(itemId)}`)}
        />
      </div>
    </div>
  );
}

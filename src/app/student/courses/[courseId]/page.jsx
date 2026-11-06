"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";

import Loader from "@/components/common/Loader";
import EmptyState from "@/components/ui/EmptyState";
import CourseDetails from "@/components/student/course-details/CourseDetails";
import useStudentCoursePage from "@/hooks/queries/student/useStudentCoursePage";
import useCourseTestReview from "@/hooks/queries/student/useCourseTestReview";
import CourseTestReviewCard from "@/components/student/test-review/CourseTestReviewCard";
import { looksLikeCourseId } from "@/lib/courseSlug";

/**
 * Course details for an enrolled student (see CourseDetails): what the
 * course is, with buttons into the course map (./map) and the player. This
 * route owns the enrolment guard and the data (useStudentCoursePage); the
 * component draws the page.
 */
export default function CourseDetailsPage({ params }) {
  const { courseId: courseKey } = use(params);
  const router = useRouter();
  const { status, course, courseId, isEnrolled, isComplete, overviewPath, learnPath, actionLabel, hasNoContent } =
    useStudentCoursePage(courseKey);
  // Test-series courses only: progress toward, then the whole-course review.
  const { data: testReview } = useCourseTestReview(courseId, { enabled: isEnrolled });

  // Mirror the address bar to the readable key when visited by id, without reloading.
  useEffect(() => {
    if (overviewPath && looksLikeCourseId(courseKey) && window.location.pathname !== overviewPath) {
      window.history.replaceState(window.history.state, "", overviewPath);
    }
  }, [overviewPath, courseKey]);

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

  // The student layout pads <main> by 64px from md up; this page has no
  // breadcrumb or toolbar above its title, so it pulls up to sit closer to
  // the navbar.
  return (
    <div className="mx-auto w-full max-w-6xl pb-16 max-lg:px-2 md:-mt-10 animate-fade-in duration-300">
      <CourseTestReviewCard review={testReview} className="mb-6" />
      <CourseDetails
        course={course}
        actionLabel={actionLabel}
        hasNoContent={hasNoContent}
        isComplete={isComplete}
        onOpenMap={() => router.push(`/student/courses/${courseKey}/map`)}
        // No ?item= — the player lands on the server's resume step.
        onContinue={() => router.push(learnPath)}
      />
    </div>
  );
}

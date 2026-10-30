"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";

import Loader from "@/components/common/Loader";
import EmptyState from "@/components/ui/EmptyState";
import StudentCourseOverview from "@/components/student/course-details/StudentCourseOverview";
import useCourse from "@/hooks/queries/student/useCourse";
import useMyCourses from "@/hooks/queries/student/useMyCourses";
import useTrackCourseAccess from "@/hooks/queries/student/useTrackCourseAccess";
import useLearningSequence from "@/hooks/queries/student/useLearningSequence";
import { normalizeCourseHierarchy } from "@/lib/courseMapper";
import { learnHref } from "@/lib/courseSlug";

// Every LESSON node of a learning-sequence tree.
function sequenceLessons(node, out = []) {
  if (!node) return out;
  if (node.kind === "LESSON") out.push(node);
  for (const entry of node.entries || []) if (entry.type === "container") sequenceLessons(entry.node, out);
  return out;
}

/**
 * Course overview for an enrolled student (see StudentCourseOverview). This
 * route owns the enrollment guard and the data; the component draws the page.
 *
 * The learning sequence is fetched here for the "Up next" lesson — it shares
 * its query key with the player, so opening the course afterwards is served
 * from cache rather than a second round trip.
 */
export default function CourseDetailsPage({ params }) {
  const { courseId } = use(params);
  const router = useRouter();

  const { data: rawCourse, isLoading, isError } = useCourse(courseId);
  const course = normalizeCourseHierarchy(rawCourse);
  const { data: sequence } = useLearningSequence(courseId);
  // What the page needs from progress — which lessons are complete, and
  // whether anything has been started — is all in the learning sequence, built
  // from the same roll-up. Reading it there spares the server a second roll-up
  // of the same progress (GET /progress/courses) on every visit.
  const completedLessonIds = sequenceLessons(sequence?.tree)
    .filter((node) => node.completed)
    .map((node) => node.id);
  const progressData = sequence ? { lessonProgresses: completedLessonIds } : undefined;
  // Any progress at all (a visited item, a completed one, or a quiz attempt —
  // attempting a quiz marks it visited too) means Start has already happened.
  const hasProgress = (sequence?.steps || []).some((step) => step.visited || step.completed);

  // Nothing here should be reachable before enrollment: a logged-in student
  // could otherwise reach the course just by typing the URL. Enrollment
  // happens on the main Orange Tree site, so a non-enrolled visitor is sent
  // back to their own courses.
  const { data: myEnrollments = [], isLoading: isEnrollmentsLoading } = useMyCourses();
  const isEnrolled = myEnrollments.some((e) => (e.courseId || e.course?.id) === courseId);

  const trackAccessMutation = useTrackCourseAccess();

  useEffect(() => {
    if (!isEnrollmentsLoading && !isEnrolled) {
      router.replace("/student/my-courses");
    } else if (!isEnrollmentsLoading && isEnrolled && courseId) {
      trackAccessMutation.mutate(courseId);
    }
  }, [isEnrollmentsLoading, isEnrolled, courseId, router]);

  if (isLoading || isEnrollmentsLoading || !isEnrolled) {
    return <Loader />;
  }

  if (isError || !course) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Course not found"
        description="The requested course could not be loaded."
      />
    );
  }

  // The learn page is addressed by the course's readable key, not its id.
  const learnPath = learnHref({ id: courseId, title: course?.title }, myEnrollments);
  const openPlayer = () => router.push(learnPath);
  // A syllabus lesson opens at that lesson's first step; the overview only
  // offers lessons the sequence says are open, and the player still falls
  // back to the current step if a lock changed in between.
  const openLesson = (lessonId) => router.push(`${learnPath}?lessonId=${lessonId}`);

  // The student layout pads <main> by 64px from md up; this page has no
  // breadcrumb or toolbar above its title, so it pulls up to sit closer to
  // the navbar.
  return (
    <div className="mx-auto w-full max-w-6xl pb-16 max-lg:px-2 md:-mt-10 animate-fade-in duration-300">
      <StudentCourseOverview
        course={course}
        progress={progressData}
        sequence={sequence}
        hasProgress={hasProgress}
        onContinue={openPlayer}
        onOpenLesson={openLesson}
      />
    </div>
  );
}
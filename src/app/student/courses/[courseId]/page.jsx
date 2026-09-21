"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronDown,
  ChevronRight,
  PanelLeftOpen,
  Play,
  User,
} from "lucide-react";

import Loader from "@/components/common/Loader";
import EmptyState from "@/components/ui/EmptyState";
import { CourseStructureSidebar } from "@/components/instructor/courses/CourseComposerSidebar";
import { CourseOverviewView } from "@/components/instructor/courses/CourseOverviewView";
import { LessonOverviewView } from "@/components/instructor/courses/LessonOverviewView";
import useCourse from "@/hooks/queries/student/useCourse";
import useMyCourses from "@/hooks/queries/student/useMyCourses";
import useTrackCourseAccess from "@/hooks/queries/student/useTrackCourseAccess";
import { useCourseProgress } from "@/hooks/queries/student";
import { getDisplayUrl } from "@/lib/blob";
import { normalizeCourseHierarchy } from "@/lib/courseMapper";

export default function CourseDetailsPage({ params }) {
  const { courseId } = use(params);
  const router = useRouter();

  const { data: rawCourse, isLoading, isError } = useCourse(courseId);
  const course = normalizeCourseHierarchy(rawCourse);
  const { data: progressData } = useCourseProgress(courseId);
  // Any progress at all (a visited item, a completed one, or a quiz attempt —
  // attempting a quiz marks it visited too) means Start has already happened.
  const hasProgress = (progressData?.visitedItems ?? 0) > 0 || (progressData?.completedItems ?? 0) > 0;

  // This page is the full module/lesson composer, complete with a "Start
  // Learning" entry point straight into lesson content — nothing here
  // should be reachable before enrollment. The Store card already keeps
  // non-enrolled students from linking here, but the route itself had no
  // guard, so a logged-in student could still reach it (and every lesson
  // under it) just by typing the URL. Sent to the public course page
  // instead, which already has the real description/duration/Buy flow.
  // The same cached /enrollments query answers both "may this viewer be here"
  // (the guard below) and the mobile hero's Enrolled chip — the course payload
  // carries only a total enrollment count, not the current user's own state.
  const { data: myEnrollments = [], isLoading: isEnrollmentsLoading } = useMyCourses();
  const isEnrolled = myEnrollments.some((e) => (e.courseId || e.course?.id) === courseId);

  const trackAccessMutation = useTrackCourseAccess();

  useEffect(() => {
    if (!isEnrollmentsLoading && !isEnrolled) {
      router.replace(`/courses/${courseId}`);
    } else if (!isEnrollmentsLoading && isEnrolled && courseId) {
      trackAccessMutation.mutate(courseId);
    }
  }, [isEnrollmentsLoading, isEnrolled, courseId, router]);

  const [isCourseMapOpen, setIsCourseMapOpen] = useState(true);
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);
  const [composerMode, setComposerMode] = useState("course");
  const [composeModuleId, setComposeModuleId] = useState(null);
  const [composeLessonId, setComposeLessonId] = useState(null);

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

  const modules = course.modules || [];
  const activeModuleObj = modules.find((m) => m.id === composeModuleId);
  const activeLessonObj = (activeModuleObj?.lessons || modules.flatMap((m) => m.lessons || [])).find(
    (l) => l.id === composeLessonId
  );

  // Hero/overview facts, all derived from the course payload already fetched.
  const lessonCount = modules.reduce((sum, m) => sum + (m.lessons?.length || 0), 0);
  const instructorName = course.creator?.name;
  const courseImage = course.thumbnailUrl ? getDisplayUrl(course.thumbnailUrl) : null;
  const description = course.description || "";
  const isLongDescription = description.length > 140;

  const handleSelectCourseOverview = () => {
    setComposerMode("course");
    setComposeModuleId(null);
    setComposeLessonId(null);
  };

  const handleSelectModule = (mod, firstLessonId) => {
    setComposerMode("module");
    setComposeModuleId(mod.id);
    setComposeLessonId(firstLessonId || mod.lessons?.[0]?.id || null);
  };

  const handleSelectLesson = (lessonId) => {
    setComposerMode("lesson");
    setComposeLessonId(lessonId);
    const parentMod = modules.find((m) => (m.lessons || []).some((l) => l.id === lessonId));
    if (parentMod) setComposeModuleId(parentMod.id);
  };

  const handleStartLearning = (targetLessonId) => {
    const firstLessonId =
      targetLessonId ||
      composeLessonId ||
      modules[0]?.lessons?.[0]?.id;
    if (firstLessonId) {
      router.push(`/student/learn/${courseId}?lessonId=${firstLessonId}`);
    } else {
      router.push(`/student/learn/${courseId}`);
    }
  };

  // The course map is a desktop affordance only. On mobile the Course Modules
  // list is the course navigation, so the rail is not rendered there at all.
  const sidebarWrapperClassName = `hidden lg:block shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out ${
    isCourseMapOpen ? "w-full lg:w-[320px]" : "w-full lg:w-0"
  }`;

  return (
    <div className="space-y-4 pb-16 max-lg:px-2 max-lg:-mb-20 max-lg:pb-4 animate-fade-in duration-300">
      {/* MAIN WORKSPACE CONTAINER MATCHING INSTRUCTOR VIEW */}
      <div className="relative flex flex-col lg:flex-row gap-3 lg:gap-5 items-start">
        {/* MOBILE ONLY — breadcrumb / back. Desktop keeps the workspace header below. */}
        <nav className="lg:hidden w-full flex items-center gap-1.5 text-[13px]" aria-label="Breadcrumb">
          <button
            type="button"
            onClick={() => router.push("/student/my-courses")}
            aria-label="Back to My Courses"
            className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg text-foreground transition hover:bg-muted cursor-pointer"
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => router.push("/student/my-courses")}
            className="shrink-0 font-semibold text-muted-foreground transition hover:text-foreground cursor-pointer"
          >
            My Courses
          </button>
          <ChevronRight size={14} className="shrink-0 text-muted-foreground/60" aria-hidden="true" />
          <span className="min-w-0 truncate font-semibold text-foreground" aria-current="page">
            {course.title}
          </span>
        </nav>

        {/* MOBILE ONLY — course identity. The learner is already inside this
            course, so this identifies it and gets out of the way: a thumbnail
            rather than a banner, the facts beside it, and the one action that
            matters across the full width. */}
        <section className="lg:hidden w-full rounded-2xl border border-border bg-card p-3.5">
          <div className="flex items-start gap-3">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
              {courseImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={courseImage} alt="" loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <BookOpen size={22} className="text-muted-foreground/30" aria-hidden="true" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              {isEnrolled && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-bold text-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                  Enrolled
                </span>
              )}

              <h1 className="line-clamp-2 text-base font-bold leading-snug text-foreground">{course.title}</h1>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-medium text-muted-foreground">
                {instructorName && (
                  <span className="flex min-w-0 items-center gap-1.5">
                    <User size={12} className="shrink-0 text-muted-foreground/70" aria-hidden="true" />
                    <span className="truncate">{instructorName}</span>
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <BookOpen size={12} className="shrink-0 text-muted-foreground/70" aria-hidden="true" />
                  {lessonCount} {lessonCount === 1 ? "Lesson" : "Lessons"}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleStartLearning()}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-3 py-2.5 text-sm font-bold text-[var(--primary-foreground)] transition hover:opacity-90 cursor-pointer"
          >
            <Play size={14} className="shrink-0 fill-current" aria-hidden="true" />
            {hasProgress ? "Continue Learning" : "Start Learning"}
            <ArrowRight size={14} className="shrink-0" aria-hidden="true" />
          </button>
        </section>
        {/* MOBILE ONLY — course overview, truncated with a read more toggle */}
        {description && (
          <section className="lg:hidden w-full space-y-2">
            <h2 className="text-base font-bold text-foreground">Course Overview</h2>
            <p
              className={`text-sm leading-relaxed text-muted-foreground ${
                !isOverviewExpanded && isLongDescription ? "line-clamp-3" : ""
              }`}
            >
              {description}
            </p>
            {isLongDescription && (
              <button
                type="button"
                onClick={() => setIsOverviewExpanded((v) => !v)}
                aria-expanded={isOverviewExpanded}
                className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary transition hover:opacity-80 cursor-pointer"
              >
                {isOverviewExpanded ? "Read less" : "Read more"}
                <ChevronDown
                  size={14}
                  className={`transition-transform ${isOverviewExpanded ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
            )}
          </section>
        )}

        {/* Left Sidebar Panel */}
        <div className={sidebarWrapperClassName}>
          <CourseStructureSidebar
            modules={modules}
            composerMode={composerMode}
            composeModuleId={composeModuleId}
            composeLessonId={composeLessonId}
            isOpen={isCourseMapOpen}
            onToggleOpen={() => setIsCourseMapOpen((v) => !v)}
            onSelectCourseOverview={handleSelectCourseOverview}
            onSelectLesson={(lessonId) => {
              handleSelectLesson(lessonId);
              handleStartLearning(lessonId);
            }}
            onSelectModule={(mod) => handleSelectModule(mod)}
            onSelectTopic={(topicId, lessonId) => handleStartLearning(lessonId)}
            onSelectSubTopic={(subTopic, context) => handleStartLearning(context?.lesson?.id)}
            onSelectConcept={(concept, context) => handleStartLearning(context?.lesson?.id)}
            onSelectContent={(content, topic, lesson) => handleStartLearning(lesson?.id)}
            onSelectSubTopicContent={(content, context) => handleStartLearning(context?.lesson?.id)}
            onSelectConceptContent={(content, context) => handleStartLearning(context?.lesson?.id)}
            onSelectQuiz={(quiz) => {
              const returnTo = `/student/courses/${courseId}`;
              router.push(`/student/attempt/${quiz.id}?from=${encodeURIComponent(returnTo)}`);
            }}
            role="STUDENT"
          />
        </div>

        {/* Center Main Workspace Notebook Area */}
        <main className="flex-1 min-w-0 w-full space-y-4">
          {/* Workspace Header & Breadcrumbs */}
          <div className="max-lg:hidden flex items-center justify-between pb-3 border-b border-transparent/80">
            <div className="flex items-center gap-3">
              {!isCourseMapOpen && (
                <button
                  type="button"
                  onClick={() => setIsCourseMapOpen(true)}
                  className="hidden lg:flex shrink-0 h-9 w-9 items-center justify-center rounded-full border border-primary/50 bg-background text-primary shadow-md transition hover:bg-primary/10 hover:border-primary hover:text-orange-300 cursor-pointer"
                  aria-label="Show course map"
                  title="Show course map"
                >
                  <PanelLeftOpen size={16} />
                </button>
              )}
              <div>
                <div className="text-xs font-semibold text-primary mb-0.5">
                  {composerMode === "course" && `Course Overview`}
                  {composerMode === "lesson" && `Lesson: ${activeLessonObj?.title || "Lesson Overview"}`}
                  {composerMode === "module" && `Module: ${activeModuleObj?.title || "Module Overview"}`}
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
                  {composerMode === "course" && (course.title || "Course Overview Header")}
                  {composerMode === "lesson" && (activeLessonObj?.title || "Lesson Overview Header")}
                  {composerMode === "module" && (activeModuleObj?.title || "Module Overview")}
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleStartLearning()}
              className="bg-primary hover:bg-orange-600 text-slate-950 font-black text-xs px-4 py-2 rounded-xl transition shadow-lg shadow-orange-500/20 cursor-pointer"
            >
              {hasProgress ? "Continue Learning" : "Start Learning"}
            </button>
          </div>

          {/* Notebook Workspace Dynamic View */}
          <div className="rounded-2xl border border-transparent bg-background/60 p-4 sm:p-6 shadow-xl max-lg:rounded-none max-lg:border-0 max-lg:bg-transparent max-lg:p-0 max-lg:shadow-none">
            {composerMode === "course" && (
              <CourseOverviewView
                course={course}
                modules={modules}
                role="STUDENT"
                mobileCompact
                onSelectModule={(mod) => handleSelectModule(mod)}
                onStartLearning={() => handleStartLearning()}
                hasProgress={hasProgress}
              />
            )}

            {composerMode === "lesson" && activeLessonObj && (
              <LessonOverviewView
                lesson={activeLessonObj}
                modules={modules.filter((m) =>
                  (m.lessons || []).some((l) => l.id === activeLessonObj.id)
                )}
                role="STUDENT"
                onSelectModule={(mod) => handleSelectModule(mod)}
              />
            )}

            {composerMode === "module" && activeModuleObj && (
              <div className="space-y-4">
                <div className="border-b border-transparent pb-3">
                  <h3 className="text-xl font-bold text-foreground">{activeModuleObj.title}</h3>
                  {activeModuleObj.subtitle && (
                    <p className="text-xs text-primary italic mt-1">{activeModuleObj.subtitle}</p>
                  )}
                  <p className="text-xs text-foreground mt-2">{activeModuleObj.description || "Module overview."}</p>
                </div>
                <h4 className="text-sm font-bold text-foreground">Module Lessons:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(activeModuleObj.lessons || []).map((l, idx) => (
                    <div
                      key={l.id}
                      onClick={() => handleStartLearning(l.id)}
                      className="p-3 rounded-xl border border-transparent bg-background/80 hover:bg-background cursor-pointer transition flex items-center justify-between"
                    >
                      <div>
                        <span className="text-[10px] font-mono text-primary font-bold block uppercase">
                          Lesson {idx + 1}
                        </span>
                        <h5 className="text-xs font-bold text-foreground mt-0.5">{l.title}</h5>
                      </div>
                      <span className="text-[11px] font-bold text-primary hover:underline">Start &rarr;</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
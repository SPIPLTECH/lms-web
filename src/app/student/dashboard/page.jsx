"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  GraduationCap,
  Trophy,
  CheckCircle,
  Activity,
  Clock,
  Play,
  CalendarIcon,
} from "lucide-react";

import useDashboard from "@/hooks/queries/student/useDashboard";
import useCourses from "@/hooks/queries/student/useCourses";
import useStudentCalendar from "@/hooks/queries/student/useStudentCalendar";
import MiniCalendar from "@/components/dashboard/MiniCalendar";
import RecommendedCoursesCarousel from "@/components/dashboard/RecommendedCoursesCarousel";
import LearningRecommendations from "@/components/student/dashboard/LearningRecommendations";
import LearningSignals from "@/components/student/dashboard/LearningSignals";
import NextActionCard from "@/components/student/learning/NextActionCard";
import ContinueLearningRow from "@/components/dashboard/ContinueLearningRow";
import RecommendedCourseCard from "@/components/dashboard/RecommendedCourseCard";
import QuickActionButton from "@/components/dashboard/QuickActionButton";
import MobileContinueCard from "@/components/dashboard/MobileContinueCard";
import StudentStatCard from "@/components/dashboard/StudentStatCard";
import UpcomingEventCard from "@/components/dashboard/UpcomingEventCard";
import AchievementItem from "@/components/dashboard/AchievementItem";
import NewAssignedWorkPanel from "@/components/dashboard/NewAssignedWorkPanel";
import { useAuth } from "@/context/AuthContext";
import { toMinutesSinceMidnight } from "@/lib/dateUtils";
import { QUOTES } from "@/constants/dashboardQuotes";
import { getAchievementsList } from "@/features/student/constants/achievementsConfig";
import { getStatCards } from "@/features/student/constants/dashboardConfig";

export default function StudentDashboardPage() {
  const { user } = useAuth();

  const { data: dashboardData, isLoading: isDashboardLoading, isError } = useDashboard();
  const { data: allCourses = [], isLoading: isCoursesLoading } = useCourses();

  const { data: calendarEvents = [], isLoading: isCalendarEventsLoading } = useStudentCalendar();

  const stats = dashboardData?.stats ?? {};
  const enrolledCourses = dashboardData?.enrolledCoursesList ?? [];

  const dailyQuote = useMemo(() => QUOTES[new Date().getDate() % QUOTES.length], []);

  const [greeting, setGreeting] = useState("Welcome back,");
  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("show_first_login_greeting") === "true") {
      sessionStorage.removeItem("show_first_login_greeting");
      setGreeting("Hi,");
    }
  }, []);

  const statCards = getStatCards({
    enrolledCount: enrolledCourses.length,
    certificatesCount: stats.certificates ?? 0,
  });

  const achievementsList = useMemo(() => getAchievementsList(stats), [stats]);
  const unlockedAchievements = achievementsList.filter((a) => a.active);

  const upcomingEvents = useMemo(() => {
    if (!calendarEvents || calendarEvents.length === 0) return [];

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    return calendarEvents
      .filter((e) => e.date === todayStr)
      .map((e) => ({ ...e, _minutes: toMinutesSinceMidnight(e.startTime) }))
      .filter((e) => e._minutes === null || e._minutes >= nowMinutes)
      .sort((a, b) => (a._minutes ?? 0) - (b._minutes ?? 0))
      .slice(0, 4);
  }, [calendarEvents]);

  // Upcoming's top should line up with Recommended for You's top — two
  // different-height first items (Welcome banner vs. Continue Learning) sit
  // above them in independent flex columns, so the placeholder box between
  // Welcome and Upcoming is sized (via measurement, not CSS alone) to push
  // Upcoming down to that same starting line. Only applied at xl+ (the
  // 3-column desktop layout); below that everything stacks naturally.
  const welcomeRef = useRef(null);
  const recommendedRef = useRef(null);
  const [placeholderHeight, setPlaceholderHeight] = useState(null);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1280px)");
    const GAP_PX = 16; // Tailwind gap-4
    const updateHeight = () => {
      if (mql.matches && welcomeRef.current && recommendedRef.current) {
        const welcomeBottom = welcomeRef.current.getBoundingClientRect().bottom;
        const recommendedTop = recommendedRef.current.getBoundingClientRect().top;
        setPlaceholderHeight(Math.max(0, recommendedTop - welcomeBottom - GAP_PX * 2));
      } else {
        setPlaceholderHeight(null);
      }
    };
    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    if (welcomeRef.current) resizeObserver.observe(welcomeRef.current);
    if (recommendedRef.current) resizeObserver.observe(recommendedRef.current);
    mql.addEventListener("change", updateHeight);

    return () => {
      resizeObserver.disconnect();
      mql.removeEventListener("change", updateHeight);
    };
  }, [isDashboardLoading, isCoursesLoading]);

  const enrolledCourseIds = useMemo(
    () => new Set(enrolledCourses.map((e) => e.courseId || e.course?.id)),
    [enrolledCourses]
  );
  // Capped well above the visible slide count (4 + peek on desktop) so the
  // carousel always has real content to scroll to.
  const recommendedCourses = useMemo(
    () => allCourses.filter((c) => !enrolledCourseIds.has(c.id)).slice(0, 12),
    [allCourses, enrolledCourseIds]
  );

  const topEnrollment = enrolledCourses[0];

  if (isError) {
    return (
      <div className="rounded-2xl bg-card border border-border p-8 text-center">
        <h2 className="text-xl font-bold text-red-500">Unable to load student dashboard</h2>
        <p className="mt-2 text-muted-foreground">Please verify your connection and try again.</p>
      </div>
    );
  }

  return (
    <>
      {/* ============================= UNIFIED RESPONSIVE LAYOUT ============================= */}
      <div className="-m-2 sm:-m-6 md:-m-16 min-h-[calc(100vh-3.5rem)] bg-background p-3 sm:p-6 pt-0 sm:pt-0">
        <div className="flex flex-col max-w-[1600px] mx-auto">

        {/*
          Layout (xl+): 3 independent columns, each its own flex stack (not
          CSS Grid rows) so a tall item in one column (e.g. a 5-course
          Continue Learning list) never pushes down unrelated items in
          another column. Each box is sized to its own natural content —
          no cross-column height stretching —
            Col 1: Continue Learning, Recommended for You
            Col 2: Welcome banner, New Assigned Work, Upcoming
            Col 3: Stats, Recent Achievements, Calendar
          Below xl: columns stack in DOM order (Welcome column first).
        */}
        <div className="mt-2 xl:mt-2 flex flex-col gap-2 xl:flex-row xl:items-start xl:gap-2">

          {/* Column: Welcome banner, (placeholder), Upcoming — stretched
              (xl:self-stretch) to match the tallest natural column, with
              Upcoming (flex-1) filling the remainder so it ends level with
              Calendar's bottom. The placeholder above Upcoming is sized
              (via measurement) so Upcoming's top lines up with Recommended
              for You's top. */}
          <div className="flex flex-col gap-2 xl:basis-0 xl:grow-[5] xl:order-2 xl:self-stretch">

            {/* Welcome Hero Card */}
            <div ref={welcomeRef} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0B0F1A] to-[#12182B] border border-border p-5 shadow-sm flex flex-col md:flex-row items-center justify-between min-h-[140px]">
              <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-primary/10 blur-[60px] pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-purple-500/10 blur-[40px] pointer-events-none" />

              <div className="relative z-10 w-full md:w-2/3 space-y-2">
                <div className="space-y-0.5">
                  <p className="text-muted-foreground text-xs font-medium">{greeting}</p>
                  <h1 className="text-xl sm:text-3xl font-bold text-foreground tracking-tight flex items-center gap-2">
                    {user?.name ? user.name.split(" ")[0] : "Student"}! <span className="animate-wave origin-bottom-right inline-block text-xl">👋</span>
                  </h1>
                  <p className="text-muted-foreground text-xs">Let&apos;s continue your learning journey. You&apos;ve got this!</p>
                </div>

                <div className="mt-2 p-2.5 rounded-xl bg-primary/5 border border-primary/20 max-w-lg inline-block">
                  <p className="text-primary text-xs font-semibold italic">&quot;{dailyQuote}&quot;</p>
                </div>
              </div>

              <div className="relative z-10 hidden md:flex w-1/3 justify-end items-center gap-3">
                <div className="h-24 w-24 lg:h-28 lg:w-28 rounded-3xl bg-gradient-to-br from-orange-500/15 to-purple-500/15 border border-border flex items-center justify-center shrink-0">
                  <GraduationCap size={40} className="text-primary" />
                </div>
                <div className="flex flex-col gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-card border border-border flex items-center justify-center text-purple-400 shadow-lg">
                    <Trophy size={18} />
                  </div>
                  <div className="h-11 w-11 rounded-2xl bg-card border border-border flex items-center justify-center text-emerald-400 shadow-lg">
                    <CheckCircle size={18} />
                  </div>
                  <div className="h-11 w-11 rounded-2xl bg-card border border-border flex items-center justify-center text-blue-400 shadow-lg">
                    <Activity size={18} />
                  </div>
                </div>
              </div>
            </div>

            {/* New Assigned Work — new quizzes/assignments/tests/projects/exams
                assigned by an instructor via course, batch, or direct
                assignment. Height is measured so Upcoming's top lines up
                with Recommended for You's top (see placeholderHeight
                above); content scrolls internally if it exceeds that. */}
            <div
              className="relative overflow-hidden rounded-2xl bg-card border border-border p-5 flex flex-col"
              style={{ minHeight: placeholderHeight ?? 80 }}
            >
              <Image
                src="/images/new.png"
                alt="New"
                width={64}
                height={64}
                className="absolute top-0 right-0 h-14 w-14 pointer-events-none select-none"
              />
              <div className="flex items-center justify-between mb-4 border-b border-border pb-3 shrink-0">
                <h3 className="text-sm font-black text-foreground">New Assigned Work</h3>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <NewAssignedWorkPanel />
              </div>
            </div>

            {/* Upcoming */}
            <div className="rounded-2xl bg-card border border-border p-5 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4 border-b border-border pb-3 shrink-0">
                <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                  <CalendarIcon size={14} className="text-primary" />
                  Upcoming (Next 30 Min)
                </h3>
                <Link href="/student/calendar" className="text-[11px] text-primary font-bold hover:text-orange-300">
                  View all
                </Link>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto">
                {isCalendarEventsLoading ? (
                  <div className="space-y-2.5">
                    {[1, 2].map((n) => (
                      <div key={n} className="h-[54px] rounded-xl bg-muted/50 animate-pulse" />
                    ))}
                  </div>
                ) : upcomingEvents.length === 0 ? (
                  <div className="py-6 text-center">
                    <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-2">
                      <Clock size={16} className="text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">Nothing scheduled for the rest of today</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingEvents.map((task) => (
                      <UpcomingEventCard key={task.id} task={task} variant="desktop" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Column: Continue Learning, Recommended for You — stretched
              (xl:self-stretch) to match the tallest natural column, with
              Recommended for You (flex-1) filling the remainder so it ends
              level with Calendar's bottom. */}
          <div className="flex flex-col gap-2 xl:basis-0 xl:grow-[4] xl:order-1 xl:self-stretch">

            {/* NEXT ACTION — the one thing to do next, above everything
                else in this column. Scoped to the course the student is
                furthest into; renders nothing until one is known. */}
            {topEnrollment?.courseId && (
              <NextActionCard courseId={topEnrollment.courseId} />
            )}

            {/* Continue Learning */}
            <div className="rounded-2xl bg-card border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-h3 text-foreground">Continue Learning</h3>
                <Link href="/student/my-courses" className="text-[11px] text-primary font-bold hover:text-primary-hover">
                  View all courses &rarr;
                </Link>
              </div>

              {isDashboardLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="h-[74px] rounded-xl bg-muted/50 animate-pulse" />
                  ))}
                </div>
              ) : enrolledCourses.length === 0 ? (
                <div className="py-10 text-center border border-dashed border-border rounded-xl">
                  <p className="text-xs text-muted-foreground">You have not enrolled in any courses yet.</p>
                  <Link href="/student/courses" className="inline-block mt-3">
                    <button className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl text-xs font-black uppercase tracking-widest transition cursor-pointer">
                      Explore Courses
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {enrolledCourses.slice(0, 5).map((enrollment, idx) => (
                    <ContinueLearningRow key={enrollment.id || enrollment.courseId || idx} enrollment={enrollment} accentIdx={idx} />
                  ))}
                </div>
              )}
            </div>

            {/* LEARNING RECOMMENDATIONS — what to study next and where the
                student is weakest, from the existing adaptive engine. Sits
                directly under Continue Learning so the most actionable thing
                on the page is above the fold, and renders nothing at all for a
                student with no activity yet rather than showing an empty card. */}
            <LearningRecommendations />

            {/* YOUR LEARNING OVER TIME — Phase 8 retention/transfer signals.
                Below the recommendations on purpose: those are what to do
                now, this is context for why. It carries no CTAs of its own,
                so it can't compete with the next-action card above. */}
            <LearningSignals />

            {/* Courses You Might Like — catalog suggestions, a different thing
                from the learning recommendations above. Retitled so the two
                aren't both called "Recommended for You". */}
            <div ref={recommendedRef} className="rounded-2xl bg-card border border-border p-5 flex-1 flex flex-col">
              <RecommendedCoursesCarousel
                title="Courses You Might Like"
                viewAllHref="/student/courses"
                courses={recommendedCourses}
                isLoading={isCoursesLoading}
                renderCard={(course) => <RecommendedCourseCard course={course} />}
                emptyMessage="No new recommendations right now — you're enrolled in everything available!"
              />
            </div>
          </div>

          {/* Column: Stats, Recent Achievements, Calendar — same sidebar
              slot at xl+, each box sized to its own natural content. */}
          <div className="flex flex-col gap-2 xl:basis-0 xl:grow-[3] xl:order-3">
            <div className="grid grid-cols-2 md:flex md:flex-nowrap xl:grid xl:grid-cols-2 items-stretch gap-2">
              {statCards.map((s) => (
                <StudentStatCard key={s.key} stat={s} isLoading={isDashboardLoading} variant="desktop" />
              ))}
            </div>

            {/* Recent Achievements */}
            <div className="rounded-2xl bg-card border border-border p-5">
              <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
                <h3 className="text-h3 text-foreground flex items-center gap-2">
                  <Trophy size={14} className="text-amber-400" />
                  Recent Achievements
                </h3>
                <Link href="/student/achievements" className="text-[11px] text-primary font-bold hover:text-primary-hover">
                  View all
                </Link>
              </div>

              {isDashboardLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="h-[54px] rounded-xl bg-muted/50 animate-pulse" />
                  ))}
                </div>
              ) : unlockedAchievements.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Keep learning to unlock your first achievement!</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-x-4 gap-y-5">
                  {unlockedAchievements.map((ach) => (
                    <AchievementItem key={ach.name} achievement={ach} />
                  ))}
                </div>
              )}
            </div>

            {/* Calendar */}
            <div className="rounded-2xl bg-card border border-border p-5">
              <div className="mb-2">
                <h3 className="text-sm font-black text-foreground">Calendar</h3>
              </div>
              <div className="dashboard-calendar-wrapper text-foreground scale-[0.95] origin-top">
                <MiniCalendar role="STUDENT" />
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}

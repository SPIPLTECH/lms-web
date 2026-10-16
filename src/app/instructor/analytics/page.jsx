"use client";

import { useEffect, useState, Suspense } from "react";
import { BarChart2, Video } from "lucide-react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";

import Card from "@/components/ui/Card";
import Loader from "@/components/common/Loader";

import AdaptiveInsightsPanel from "@/components/instructor/analytics/AdaptiveInsightsPanel";
import { useInstructorCourses } from "@/hooks/queries/instructor/useInstructorCourses";
import { useDashboardKPIs } from "@/hooks/queries/instructor/useInstructorDashboard";

// Dynamically imported so recharts (bundled once per dynamic() boundary
// instead of once per static-import route) is shared across every
// chart-bearing page rather than duplicated in each one's own chunk.
const StudentEngagement = dynamic(() => import("@/components/instructor/dashboard/StudentEngagement"), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse bg-muted/50 rounded-2xl" />,
});

function InstructorAnalyticsContent() {
  const searchParams = useSearchParams();
  const urlCourseId = searchParams.get("courseId") || "";
  const [selectedCourseId, setSelectedCourseId] = useState(urlCourseId);

  const { data: courses = [], isLoading: loadingCourses } = useInstructorCourses();

  useEffect(() => {
    if (!selectedCourseId && courses.length > 0) {
      setSelectedCourseId(courses[0].id);
    }
  }, [courses, selectedCourseId]);

  const { data: kpis = [] } = useDashboardKPIs(selectedCourseId);

  const activeCourse = courses.find((c) => c.id === selectedCourseId) || null;
  const videoKpi = kpis.find((k) => k.title === "Total Video Watch Time");

  if (loadingCourses) return <Loader />;

  return (
    <div className="space-y-6 pb-12">
      <div className="rounded-2xl border border-transparent bg-background/60 p-5 shadow-sm flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight leading-none">Analytics</h1>
          <p className="text-xs text-muted-foreground mt-1.5">Student engagement for {activeCourse?.title || "your course"}.</p>
        </div>
        {courses.length > 0 && (
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="rounded-xl border border-transparent bg-background px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-primary hover:border-primary transition cursor-pointer outline-none"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        )}
      </div>

      {!selectedCourseId ? (
        <Card className="p-10 border border-transparent bg-background/60 text-center space-y-2">
          <BarChart2 size={26} className="mx-auto text-slate-600" />
          <p className="text-xs font-bold text-muted-foreground">Create a course to see analytics.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {videoKpi && (
            <Card className="p-6 border border-transparent bg-background/60 shadow-lg flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Video size={24} />
                </div>
                <div>
                  <h3 className="text-md font-bold text-foreground">Total Video Engagement</h3>
                  <p className="text-xs text-muted-foreground mt-1">Total time students spent watching video lessons in this course.</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-indigo-400">{videoKpi.value}</div>
                <div className="text-xs text-emerald-400 font-semibold mt-1">{videoKpi.status}</div>
              </div>
            </Card>
          )}

          <StudentEngagement courseId={selectedCourseId} />

          {/* ADAPTIVE LEARNING — Phase 9. Observational analytics over the
              existing deterministic engine: which learners need attention and
              why, which concepts are not sticking, and what the engine is
              already telling each learner. Nothing on this panel changes a
              learning decision. */}
          <AdaptiveInsightsPanel courseId={selectedCourseId} />
        </div>
      )}
    </div>
  );
}

export default function InstructorAnalyticsPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[400px] items-center justify-center"><Loader /></div>}>
      <InstructorAnalyticsContent />
    </Suspense>
  );
}

"use client";

import PageHeader from "@/components/layouts/PageHeader";
import Card from "@/components/ui/Card";
import AdminInsightsPanel from "@/components/admin/analytics/AdminInsightsPanel";
import PlatformTrend from "@/components/admin/analytics/PlatformTrend";
import { useCourseAnalyticsList, usePlatformAnalytics } from "@/hooks/queries/admin/useAdminAnalytics";

/**
 * Admin analytics — the Analytics agent's daily snapshots (platform and
 * course metrics, with a 30-day trend) and the Admin Intelligence agent's
 * insights on top of them.
 */

function Kpi({ label, value, hint }) {
    return (
        <div className="min-w-0 rounded-xl bg-muted/50 p-3 sm:p-4">
            <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-[11px]">{label}</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-foreground sm:text-2xl">{value === null || value === undefined ? "—" : value}</p>
            {hint && <p className="truncate text-[10px] text-muted-foreground sm:text-xs">{hint}</p>}
        </div>
    );
}

export default function AnalyticsPage() {
    const platform = usePlatformAnalytics();
    const courses = useCourseAnalyticsList();
    const current = platform.data?.current;

    return (
        <div className="flex flex-col gap-6 py-2">
            <PageHeader title="Analytics" subtitle="Learning across the institution — refreshed nightly, and on first view each day." />

            <AdminInsightsPanel />

            <Card tone="flat">
                <div className="p-5">
                    <h2 className="text-h3 text-foreground">Platform today</h2>
                    {platform.isLoading && <div className="mt-3 h-20 rounded-xl bg-muted/50 animate-pulse" />}
                    {platform.isError && <p className="mt-3 text-sm text-muted-foreground">Couldn&apos;t load platform metrics.</p>}
                    {current && (
                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                            <Kpi label="Students" value={current.students} />
                            <Kpi label="Active (7d)" value={current.activeLearners7d} hint={current.activeLearnerPercent !== null ? `${current.activeLearnerPercent}% of students` : null} />
                            <Kpi label="At risk" value={current.atRiskLearners} />
                            <Kpi label="New enrolments (7d)" value={current.newEnrollments7d} />
                            <Kpi label="Completions (30d)" value={current.completions30d} />
                            <Kpi label="AI questions (7d)" value={current.aiMessages7d} />
                        </div>
                    )}

                    {platform.data?.trend?.length > 0 && (
                        <div className="mt-5">
                            <h3 className="mb-1 text-sm font-bold text-foreground">Last 30 days</h3>
                            <PlatformTrend trend={platform.data.trend} />
                        </div>
                    )}
                </div>
            </Card>

            <Card tone="flat">
                <div className="p-5">
                    <h2 className="text-h3 text-foreground">Courses</h2>
                    {courses.isLoading && <div className="mt-3 h-24 rounded-xl bg-muted/50 animate-pulse" />}
                    {courses.data && courses.data.length === 0 && <p className="mt-3 text-sm text-muted-foreground">No published courses yet.</p>}
                    {courses.data && courses.data.length > 0 && (
                        <div className="mt-3 overflow-x-auto">
                            <table className="w-full min-w-[640px] text-left text-xs">
                                <thead className="text-muted-foreground">
                                    <tr>
                                        <th className="pb-2 font-medium">Course</th>
                                        <th className="pb-2 text-right font-medium">Enrolled</th>
                                        <th className="pb-2 text-right font-medium">Active (7d)</th>
                                        <th className="pb-2 text-right font-medium">Avg progress</th>
                                        <th className="pb-2 text-right font-medium">Completion</th>
                                        <th className="pb-2 text-right font-medium">Quiz avg (30d)</th>
                                        <th className="pb-2 text-right font-medium">At risk</th>
                                    </tr>
                                </thead>
                                <tbody className="tabular-nums text-foreground">
                                    {courses.data.map((c) => (
                                        <tr key={c.courseId} className="border-t border-border/60">
                                            <td className="max-w-[260px] truncate py-1.5">{c.title}</td>
                                            <td className="py-1.5 text-right">{c.enrolled}</td>
                                            <td className="py-1.5 text-right">{c.activeLearners7d}</td>
                                            <td className="py-1.5 text-right">{c.avgProgress === null ? "—" : `${c.avgProgress}%`}</td>
                                            <td className="py-1.5 text-right">{c.completionRate === null ? "—" : `${c.completionRate}%`}</td>
                                            <td className="py-1.5 text-right">{c.avgQuizScore30d === null ? "—" : `${c.avgQuizScore30d}%`}</td>
                                            <td className="py-1.5 text-right">{c.atRiskPercent === null ? "—" : `${c.atRiskPercent}%`}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}

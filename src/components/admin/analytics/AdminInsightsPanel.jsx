"use client";

import { AlertTriangle, Building2, Info, Users } from "lucide-react";

import { useAdminIntelligence } from "@/hooks/queries/admin/useAdminAnalytics";

/**
 * Admin Intelligence agent — institution health, alerts, departments
 * (course categories) and faculty (instructors). Read from Analytics' own
 * metrics; every alert states the numbers that triggered it.
 */

const HEALTH_TONES = {
    GOOD: "bg-success/10 text-success",
    FAIR: "bg-warning/10 text-warning",
    POOR: "bg-destructive/10 text-destructive",
};

const SEVERITY = {
    HIGH: { icon: AlertTriangle, tone: "text-destructive", label: "High" },
    MEDIUM: { icon: Info, tone: "text-warning", label: "Medium" },
};

function HealthBadge({ level, score }) {
    if (!level) return <span className="text-xs text-muted-foreground">No learners yet</span>;
    return (
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${HEALTH_TONES[level]}`}>
            {level === "GOOD" ? "Good" : level === "FAIR" ? "Fair" : "Poor"} · {score}/100
        </span>
    );
}

export default function AdminInsightsPanel() {
    const { data, isLoading, isError } = useAdminIntelligence();

    if (isLoading) return <div className="h-40 rounded-2xl bg-muted/50 animate-pulse" />;
    if (isError || !data) {
        return <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">Couldn&apos;t load insights.</p>;
    }

    const { institutionHealth: health, alerts, departments, faculty } = data;

    return (
        <section className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-h3 text-foreground">Institution health</h2>
                    <HealthBadge level={health.level} score={health.score} />
                </div>
                {health.level && (
                    <p className="mt-1 text-xs text-muted-foreground">
                        {health.learners} enrolments · average progress {health.avgProgress ?? "—"}% · engagement {health.avgEngagement ?? "—"}/100 ·{" "}
                        {health.atRiskPercent}% at risk
                    </p>
                )}

                <h3 className="mt-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Alerts</h3>
                {alerts.length === 0 ? (
                    <p className="mt-1.5 text-sm text-muted-foreground">Nothing needs attention right now.</p>
                ) : (
                    <ul className="mt-1.5 space-y-2">
                        {alerts.map((alert, i) => {
                            const s = SEVERITY[alert.severity] ?? SEVERITY.MEDIUM;
                            const Icon = s.icon;
                            return (
                                <li key={`${alert.type}-${alert.courseId ?? i}`} className="flex items-start gap-3 rounded-xl border border-border bg-background/40 p-3">
                                    <Icon size={15} className={`mt-0.5 shrink-0 ${s.tone}`} aria-label={`${s.label} severity`} />
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-foreground">{alert.title}</p>
                                        <p className="text-xs text-muted-foreground">{alert.detail}</p>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-border bg-card p-5">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
                        <Building2 size={14} className="text-primary" aria-hidden /> Departments
                    </h3>
                    {departments.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No courses yet.</p>
                    ) : (
                        <ul className="divide-y divide-border/60">
                            {departments.map((d) => (
                                <li key={d.name} className="flex items-center justify-between gap-2 py-2">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm text-foreground">{d.name}</p>
                                        <p className="text-[11px] text-muted-foreground">
                                            {d.courses} course{d.courses === 1 ? "" : "s"} · {d.learners} learners
                                        </p>
                                    </div>
                                    <HealthBadge level={d.level} score={d.score} />
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="rounded-2xl border border-border bg-card p-5">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
                        <Users size={14} className="text-primary" aria-hidden /> Faculty
                    </h3>
                    {faculty.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No instructors with courses yet.</p>
                    ) : (
                        <table className="w-full text-left text-xs">
                            <thead className="text-muted-foreground">
                                <tr>
                                    <th className="pb-2 font-medium">Instructor</th>
                                    <th className="pb-2 text-right font-medium">Courses</th>
                                    <th className="pb-2 text-right font-medium">Learners</th>
                                    <th className="pb-2 text-right font-medium">Completion</th>
                                    <th className="pb-2 text-right font-medium">At risk</th>
                                </tr>
                            </thead>
                            <tbody className="tabular-nums text-foreground">
                                {faculty.map((f) => (
                                    <tr key={f.instructorId} className="border-t border-border/60">
                                        <td className="py-1.5">{f.name}</td>
                                        <td className="py-1.5 text-right">{f.courses}</td>
                                        <td className="py-1.5 text-right">{f.learners}</td>
                                        <td className="py-1.5 text-right">{f.completionRate === null ? "—" : `${f.completionRate}%`}</td>
                                        <td className="py-1.5 text-right">{f.atRiskPercent === null ? "—" : `${f.atRiskPercent}%`}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </section>
    );
}

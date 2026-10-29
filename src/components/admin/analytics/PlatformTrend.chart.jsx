"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/**
 * Active vs at-risk learners over the last 30 days (Analytics agent
 * snapshots). One y-axis — both series are learner counts. Colours are the
 * dataviz reference categorical slots 1-2, validated (all six checks pass)
 * in light and dark against the chart surface; identity is never colour
 * alone (legend + end-of-line labels).
 */

const SERIES = [
    { key: "active", label: "Active learners (7d)", color: "var(--viz-series-1)" },
    { key: "atRisk", label: "At-risk learners", color: "var(--viz-series-2)" },
];

const shortDate = (iso) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" });

function TrendTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm">
            <p className="mb-1 font-semibold text-foreground">{shortDate(label)}</p>
            {payload.map((p) => (
                <p key={p.dataKey} className="flex items-center gap-2 text-muted-foreground">
                    <span className="h-2 w-2 rounded-full" style={{ background: p.color }} aria-hidden />
                    <span>{SERIES.find((s) => s.key === p.dataKey)?.label}</span>
                    <span className="ml-auto font-semibold tabular-nums text-foreground">{p.value ?? "—"}</span>
                </p>
            ))}
        </div>
    );
}

/** End-of-line direct label, so a series is named where it ends. */
const endLabel = (series, lastIndex) =>
    function EndLabel({ x, y, index, value }) {
        if (index !== lastIndex || value === null || value === undefined) return null;
        return (
            <text x={x + 6} y={y} dy={4} fontSize={11} fill="var(--muted-foreground)">
                {value}
            </text>
        );
    };

export default function PlatformTrendChart({ trend }) {
    const data = trend.map((row) => ({
        date: row.date,
        active: row.metrics?.activeLearners7d ?? null,
        atRisk: row.metrics?.atRiskLearners ?? null,
    }));
    const lastIndex = data.length - 1;

    return (
        <div className="viz-trend">
            <style>{`
                .viz-trend { --viz-series-1: #2a78d6; --viz-series-2: #eb6834; }
                .dark .viz-trend { --viz-series-1: #3987e5; --viz-series-2: #d95926; }
            `}</style>

            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 8, right: 36, bottom: 0, left: -12 }}>
                        <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.6} />
                        <XAxis
                            dataKey="date"
                            tickFormatter={shortDate}
                            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                            axisLine={false}
                            tickLine={false}
                            minTickGap={24}
                        />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={40} />
                        <Tooltip content={<TrendTooltip />} cursor={{ stroke: "var(--muted-foreground)", strokeOpacity: 0.4 }} />
                        <Legend
                            verticalAlign="top"
                            align="left"
                            height={28}
                            iconType="plainline"
                            formatter={(value) => <span className="text-xs text-muted-foreground">{SERIES.find((s) => s.key === value)?.label}</span>}
                        />
                        {SERIES.map((s) => (
                            <Line
                                key={s.key}
                                type="monotone"
                                dataKey={s.key}
                                stroke={s.color}
                                strokeWidth={2}
                                dot={data.length === 1 ? { r: 4, fill: s.color, strokeWidth: 2, stroke: "var(--card)" } : false}
                                activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
                                connectNulls
                                isAnimationActive={false}
                                label={endLabel(s, lastIndex)}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <details className="mt-2">
                <summary className="cursor-pointer text-[11px] text-muted-foreground">Show as table</summary>
                <table className="mt-2 w-full text-left text-xs">
                    <thead className="text-muted-foreground">
                        <tr>
                            <th className="py-1 font-medium">Date</th>
                            {SERIES.map((s) => (
                                <th key={s.key} className="py-1 text-right font-medium">{s.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="tabular-nums text-foreground">
                        {data.map((row) => (
                            <tr key={row.date} className="border-t border-border/60">
                                <td className="py-1">{shortDate(row.date)}</td>
                                <td className="py-1 text-right">{row.active ?? "—"}</td>
                                <td className="py-1 text-right">{row.atRisk ?? "—"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </details>
        </div>
    );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MicOff } from "lucide-react";

import DataTable from "@/components/ui/DataTable";
import Pagination from "@/components/ui/Pagination";
import { useProctoringReviews } from "@/hooks/queries/instructor/useProctoringReviews";
import { DECISION_DONE, flagReasonLabel } from "@/lib/proctoring/reviewLabels";

const TABS = [
    ["PENDING", "Waiting for a decision"],
    ["DECIDED", "Decided"],
    ["ALL", "All"],
];

const TAG_LABELS = { FINAL: "Final", QUALIFYING: "Qualifying" };

const when = (value) => (value ? new Date(value).toLocaleString() : "-");

function Pill({ tone = "muted", children }) {
    const tones = {
        muted: "border-border bg-background/60 text-muted-foreground",
        rose: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
        amber: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
    };
    return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${tones[tone]}`}>{children}</span>;
}

/** Every proctored attempt that needs a person. Qualifying tests appear here as well as Finals. */
export default function ReviewList({ basePath, title = "Proctored exams" }) {
    const router = useRouter();
    const [state, setState] = useState("PENDING");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(25);
    const { data, isLoading, isError } = useProctoringReviews({ state, page, limit });

    const columns = [
        {
            key: "student",
            header: "Student",
            render: (row) => (
                <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{row.studentName ?? "Account removed"}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{row.studentEmail}</p>
                </div>
            ),
        },
        {
            key: "quiz",
            header: "Exam",
            render: (row) => (
                <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{row.quizTitle}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{TAG_LABELS[row.quizTag] ?? row.quizTag} · {row.courseTitle}</p>
                </div>
            ),
        },
        {
            key: "why",
            header: "Why",
            render: (row) => (
                <div className="flex flex-wrap items-center gap-1">
                    {row.status === "TERMINATED" ? <Pill tone="rose">Ended by proctoring</Pill> : <Pill tone="amber">Flagged</Pill>}
                    {row.isAppeal && <Pill tone="amber">Appeal</Pill>}
                    {row.microphoneStatus === "REFUSED" && (
                        <Pill>
                            <MicOff className="h-3 w-3" aria-hidden /> No microphone
                        </Pill>
                    )}
                    {row.flagReasons.length > 0 && <span className="w-full truncate text-[11px] text-muted-foreground" title={row.flagReasons.map(flagReasonLabel).join("; ")}>{flagReasonLabel(row.flagReasons[0])}{row.flagReasons.length > 1 ? ` +${row.flagReasons.length - 1}` : ""}</span>}
                </div>
            ),
        },
        { key: "score", header: "Score", render: (row) => (row.percentage != null ? `${row.percentage}%` : "-") },
        { key: "ended", header: "Ended", render: (row) => when(row.endedAt) },
        {
            key: "state",
            header: "Status",
            render: (row) =>
                row.reviewState === "PENDING" ? (
                    row.overdue ? <Pill tone="rose">Overdue</Pill> : <span className="text-[11px] text-muted-foreground">Due {when(row.reviewDueAt)}</span>
                ) : (
                    <Pill>{DECISION_DONE[row.decision] ?? "Decided"}</Pill>
                ),
        },
    ];

    return (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h1 className="text-lg font-semibold text-foreground">{title}</h1>
                    <p className="text-xs text-muted-foreground">These are signals for you to review, not proof of misconduct. Nothing is decided until a person decides it.</p>
                </div>
                <div role="tablist" aria-label="Filter reviews" className="flex gap-1 rounded-lg bg-background/60 p-1">
                    {TABS.map(([id, label]) => (
                        <button
                            key={id}
                            type="button"
                            role="tab"
                            aria-selected={state === id}
                            onClick={() => {
                                setState(id);
                                setPage(1);
                            }}
                            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${state === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {isError ? (
                <p role="alert" className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
                    The list could not be loaded. Please try again.
                </p>
            ) : (
                <DataTable
                    columns={columns}
                    rows={data?.items ?? []}
                    rowKey="attemptId"
                    isLoading={isLoading}
                    skeletonRows={5}
                    emptyLabel={state === "PENDING" ? "Nothing is waiting for a decision." : "No attempts to show."}
                    onRowClick={(row) => router.push(`${basePath}/${row.attemptId}`)}
                />
            )}

            {data && data.total > 0 && (
                <Pagination
                    page={data.page}
                    totalPages={data.totalPages}
                    total={data.total}
                    limit={limit}
                    onPageChange={setPage}
                    onLimitChange={(next) => {
                        setLimit(next);
                        setPage(1);
                    }}
                />
            )}
        </div>
    );
}

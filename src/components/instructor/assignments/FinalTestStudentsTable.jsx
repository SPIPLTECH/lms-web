"use client";

import { formatDistanceToNow } from "date-fns";

import DataTable from "@/components/ui/DataTable";

/**
 * Every enrolled student's standing on one Final test.
 *
 * Students who never sat it are listed too, because the gauge counts against
 * enrolment — hiding them would leave this table unable to explain the number
 * above it.
 *
 * Read-only: MCQ attempts are auto-marked at submit time, so unlike an
 * assignment there is nothing here for an instructor to grade.
 */

/** "2 days ago" — yields nothing rather than throwing on an unparseable date. */
function timeAgo(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return formatDistanceToNow(date, { addSuffix: true });
}

const COLUMNS = [
  {
    key: "studentName",
    header: "Student Name",
    render: (s) => (
      <div className="min-w-0">
        <p className="truncate font-bold text-foreground">{s.studentName}</p>
        {s.studentEmail && (
          <p className="truncate text-[10px] font-semibold text-muted-foreground">{s.studentEmail}</p>
        )}
      </div>
    ),
  },
  {
    key: "score",
    header: "Score",
    align: "right",
    render: (s) =>
      s.attempted ? (
        <span className="font-bold tabular-nums">
          {s.score}/{s.totalMarks}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: "percentage",
    header: "Percent",
    align: "right",
    render: (s) =>
      s.attempted ? (
        <span className="tabular-nums">{s.percentage}%</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: "passed",
    header: "Result",
    align: "center",
    render: (s) => {
      if (!s.attempted) {
        return (
          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
            Not attempted
          </span>
        );
      }
      return s.passed ? (
        <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
          Passed
        </span>
      ) : (
        <span className="rounded-full border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-500">
          Failed
        </span>
      );
    },
  },
  {
    key: "submittedAt",
    header: "Attempted",
    align: "right",
    render: (s) => (
      <span className="whitespace-nowrap text-muted-foreground">
        {/* Retakes are allowed, so this is the most recent attempt. */}
        {timeAgo(s.submittedAt) || "—"}
        {s.attemptsCount > 1 && (
          <span className="ml-1 font-semibold text-muted-foreground/70">×{s.attemptsCount}</span>
        )}
      </span>
    ),
  },
];

export default function FinalTestStudentsTable({ students = [], isLoading = false }) {
  return (
    <DataTable
      columns={COLUMNS}
      rows={students}
      rowKey="studentId"
      isLoading={isLoading}
      skeletonRows={4}
      emptyLabel="No students are enrolled in this course yet."
    />
  );
}

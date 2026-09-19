"use client";

import { ClipboardList } from "lucide-react";

import Card from "@/components/ui/Card";
import GradableRow from "@/components/instructor/assignments/GradableRow";
import { useFinalTestOverview } from "@/hooks/queries/instructor/useResults";
import { DEFAULT_SORT, sortGradables } from "@/lib/gradableSort";

/**
 * Final tests one row per TEST — where it lives and how much of the class has
 * sat it — each opening that test's own page for the student breakdown.
 *
 * Grouped per test rather than per attempt, which is what GET /results returns.
 */
export default function FinalTestResultsPanel({ courseId, listQuery = "", sortKey = DEFAULT_SORT }) {
  const { data, isLoading, isError } = useFinalTestOverview(courseId);
  const tests = sortGradables(data || [], sortKey);

  if (isError) {
    return (
      <Card className="border border-slate-850 bg-background/40 p-5">
        <p role="alert" className="py-6 text-xs font-semibold text-red-400">
          Test results couldn&apos;t be loaded. Refresh the page to try again.
        </p>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  if (tests.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 border border-transparent bg-background/60 p-8 text-center">
        <ClipboardList size={22} className="text-slate-600" />
        <p className="text-xs font-bold text-muted-foreground">No Final tests in your courses yet.</p>
      </Card>
    );
  }

  return (
    // No heading here: the page toolbar already names whichever list is
    // showing, and a second "Final Tests" under it would just repeat.
    <section>
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-background/40">
        {tests.map((test) => {
        const badges = [];
        if (test.notAttemptedCount > 0) {
          badges.push({
            label: `${test.notAttemptedCount} not attempted`,
            tone: "border-amber-500/25 bg-amber-500/10 text-amber-500",
          });
        }
        if (test.failedCount > 0) {
          badges.push({
            label: `${test.failedCount} failed`,
            tone: "border-red-500/25 bg-red-500/10 text-red-500",
          });
        }

        return (
          <GradableRow
            key={test.id}
            href={`/instructor/final-tests/${test.id}${
              listQuery ? `?from=${encodeURIComponent(listQuery)}` : ""
            }`}
            breadcrumb={test}
            title={test.title}
            gauge={{
              value: test.attemptedCount,
              total: test.enrolledCount,
              label: "attempted",
            }}
            badges={badges}
          />
        );
        })}
      </div>
    </section>
  );
}

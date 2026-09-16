"use client";

import { Suspense, use } from "react";

import Card from "@/components/ui/Card";
import Loader from "@/components/common/Loader";
import FinalTestStudentsTable from "@/components/instructor/assignments/FinalTestStudentsTable";
import GradableDetailHeader from "@/components/instructor/assignments/GradableDetailHeader";
import { useFinalTest } from "@/hooks/queries/instructor/useResults";

/**
 * One Final test and how every enrolled student did on it.
 *
 * The drill-down stops here: MCQ attempts are auto-marked at submit time, so
 * there is no per-student grading step the way there is for an assignment.
 */
function InstructorFinalTestDetailPageView({ params }) {
  const { quizId } = use(params);
  const { data: test, isLoading, isError } = useFinalTest(quizId);

  const notFound = !isLoading && !isError && !test;

  return (
    <div className="space-y-4 pb-12 animate-fade-in duration-300">
      <GradableDetailHeader
        item={test}
        title={test?.title || "Final test"}
        fallbackView="final-tests"
        isLoading={isLoading}
        gauge={
          test
            ? { value: test.attemptedCount, total: test.enrolledCount, label: "attempted" }
            : null
        }
      />

      <Card className="border border-slate-850 bg-background/40 p-5">
        {isError ? (
          <p role="alert" className="py-6 text-xs font-semibold text-red-400">
            This test couldn&apos;t be loaded. Refresh the page to try again.
          </p>
        ) : notFound ? (
          <p className="py-6 text-center text-xs font-semibold text-muted-foreground">
            This Final test doesn&apos;t exist, or it isn&apos;t in one of your courses.
          </p>
        ) : (
          <FinalTestStudentsTable students={test?.students || []} isLoading={isLoading} />
        )}
      </Card>
    </div>
  );
}

export default function InstructorFinalTestDetailPage({ params }) {
  // useSearchParams (in the header) needs a Suspense boundary above it.
  return (
    <Suspense fallback={<Loader />}>
      <InstructorFinalTestDetailPageView params={params} />
    </Suspense>
  );
}

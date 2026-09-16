"use client";

import { Suspense, use } from "react";

import Card from "@/components/ui/Card";
import Loader from "@/components/common/Loader";
import AssignmentSubmissionsPanel from "@/components/instructor/assignments/AssignmentSubmissionsPanel";
import GradableDetailHeader from "@/components/instructor/assignments/GradableDetailHeader";
import { useAssignmentSubmissions } from "@/hooks/queries/instructor/useAssignments";

/**
 * One Course Assessment (an Assignment row) and the students who submitted it.
 *
 * The panel below runs the same query as the header, so React Query serves
 * both from one fetch rather than two.
 */
function InstructorAssignmentDetailPageView({ params }) {
  const { assignmentId } = use(params);
  const { data, isLoading, isError } = useAssignmentSubmissions(assignmentId);
  const assignment = data?.assignment;

  return (
    <div className="space-y-4 pb-12 animate-fade-in duration-300">
      <GradableDetailHeader
        item={assignment}
        title={assignment?.title || "Assignment"}
        fallbackView="assignments"
        isLoading={isLoading}
        gauge={
          assignment
            ? {
                value: data?.submissions?.length || 0,
                total: assignment.enrolledCount,
                label: "submitted",
              }
            : null
        }
      />

      <Card className="border border-slate-850 bg-background/40 p-5">
        {isError ? (
          <p role="alert" className="py-6 text-xs font-semibold text-red-400">
            This assignment couldn&apos;t be loaded. Refresh the page to try again.
          </p>
        ) : (
          <AssignmentSubmissionsPanel assignmentId={assignmentId} />
        )}
      </Card>
    </div>
  );
}

export default function InstructorAssignmentDetailPage({ params }) {
  // useSearchParams (in the header) needs a Suspense boundary above it.
  return (
    <Suspense fallback={<Loader />}>
      <InstructorAssignmentDetailPageView params={params} />
    </Suspense>
  );
}

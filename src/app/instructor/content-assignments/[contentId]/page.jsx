"use client";

import { Suspense, use } from "react";

import Card from "@/components/ui/Card";
import Loader from "@/components/common/Loader";
import AssignmentSubmissionsPanel from "@/components/instructor/assignments/AssignmentSubmissionsPanel";
import GradableDetailHeader from "@/components/instructor/assignments/GradableDetailHeader";
import { useContentSubmissions } from "@/hooks/queries/instructor/useAssignments";

/**
 * One Lesson Assignment (an Assignment cell from the Course Composer, which is
 * a Content row rather than an Assignment row) and the students who submitted.
 *
 * Separate route from /instructor/assignments/[assignmentId] because the two
 * are different records behind different endpoints — the same split the
 * student side already makes between /assignments and /content-assignments.
 */
function InstructorContentAssignmentDetailPageView({ params }) {
  const { contentId } = use(params);
  const { data, isLoading, isError } = useContentSubmissions(contentId);
  const content = data?.content;

  return (
    <div className="space-y-4 pb-12 animate-fade-in duration-300">
      <GradableDetailHeader
        item={content}
        title={content?.title || "Assignment"}
        fallbackView="assignments"
        isLoading={isLoading}
        gauge={
          content
            ? {
                value: data?.submissions?.length || 0,
                total: content.enrolledCount,
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
          <AssignmentSubmissionsPanel contentId={contentId} />
        )}
      </Card>
    </div>
  );
}

export default function InstructorContentAssignmentDetailPage({ params }) {
  // useSearchParams (in the header) needs a Suspense boundary above it.
  return (
    <Suspense fallback={<Loader />}>
      <InstructorContentAssignmentDetailPageView params={params} />
    </Suspense>
  );
}

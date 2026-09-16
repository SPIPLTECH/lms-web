"use client";

import Loader from "@/components/common/Loader";
import Card from "@/components/ui/Card";
import useAssignment from "@/hooks/queries/student/useAssignment";
import AssignmentSubmissionPanel from "@/components/student/assignments/AssignmentSubmissionPanel";

/**
 * Renders one Assignment inside the existing learning workspace frame, the
 * same way a quiz block does — the student never leaves the player to do it.
 *
 * The Course Map row only carries the id and title, so the full brief,
 * reference attachments and the student's own prior submission are fetched
 * here via the existing GET /assignments/:id. `completed` comes from the
 * backend Progress index the workspace already holds; nothing about
 * completion is decided in this component.
 */
export default function AssignmentWorkspacePanel({ assignmentId, completed = false, onNextContent }) {
  const { data: assignment, isLoading, isError } = useAssignment(assignmentId);

  if (isLoading) return <Loader />;

  if (isError || !assignment) {
    return (
      <Card className="p-6 text-center text-base text-muted-foreground">
        This assignment could not be loaded. Please try again.
      </Card>
    );
  }

  return (
    <AssignmentSubmissionPanel
      assignment={assignment}
      completed={completed}
      onNextContent={onNextContent}
      showStatusLink
    />
  );
}

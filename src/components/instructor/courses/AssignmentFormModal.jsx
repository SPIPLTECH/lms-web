"use client";

import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import AssessmentForm from "@/components/instructor/AssessmentForm";
import { useCreateAssignment } from "@/hooks/queries/instructor/useAssignments";

/**
 * Creates a real Assignment ENTITY from the Course Composer — not a Content
 * cell of type ASSIGNMENT, which is what the composer's "Assignment" block
 * writes and which therefore sits with the course's content.
 *
 * The thin binding between three existing pieces: the Modal shell,
 * AssessmentForm (whose `mode="create"` path had no caller since assignment
 * creation moved into the content composer) and useCreateAssignment. It is a
 * separate component from EntityFormModal because that one is for the
 * structural entities sharing a title+description+isPublished form; an
 * Assignment carries a due date, marks, a type and attachments, and a
 * different mutation set.
 *
 * No `order` is sent: the backend gives a Course-level assignment its place
 * after every Module and before every Course Quiz.
 */
export function AssignmentFormModal({ open, onClose, courseId, onCreated }) {
  const createAssignment = useCreateAssignment();
  const { showToast } = useToast();

  const handleSubmit = async (payload) => {
    try {
      const created = await createAssignment.mutateAsync({
        courseId,
        title: payload.title,
        description: payload.description || "",
        assessmentType: payload.assessmentType || null,
        marks: payload.marks,
        dueDate: payload.dueDate,
        totalQuestions: payload.totalQuestions,
        estimatedTime: payload.estimatedTime,
        resources: payload.resources,
        attachments: payload.attachments || [],
        isPublished: payload.isPublished !== false,
      });
      showToast("Assignment created", "success", "Saved");
      onCreated?.(created);
      onClose?.();
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to create assignment", "error");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create Assignment" size="lg">
      <AssessmentForm
        mode="create"
        lockedCourseId={courseId}
        loading={createAssignment.isPending}
        submitLabel="Create Assignment"
        onSubmit={handleSubmit}
      />
    </Modal>
  );
}

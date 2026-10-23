"use client";

import { useState } from "react";

import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import AssessmentForm from "@/components/instructor/AssessmentForm";
import { useCreateAssignment } from "@/hooks/queries/instructor/useAssignments";
import AutoEvaluationSetup, {
  checkAutoEvaluationSetup,
  saveAutoEvaluationSetup,
} from "@/components/instructor/assignments/evaluation/AutoEvaluationSetup";

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
  const [evaluation, setEvaluation] = useState(null);

  const handleSubmit = async (payload) => {
    // Checked first, so a bad marking scheme never leaves a half-made assignment.
    const problem = checkAutoEvaluationSetup(evaluation);
    if (problem) {
      showToast(problem, "error", "Auto-evaluation");
      return;
    }
    // The scheme's total is the assignment's marks; they must agree.
    if (evaluation && Number(evaluation.maxMarks) !== Number(payload.marks)) {
      showToast(
        `The marking scheme's total (${evaluation.maxMarks}) must equal the assignment's Marks (${payload.marks}).`,
        "error",
        "Auto-evaluation"
      );
      return;
    }
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
      const evaluationError = await saveAutoEvaluationSetup(created?.id, evaluation);
      if (evaluationError) showToast(evaluationError, "error", "Auto-evaluation");
      else showToast("Assignment created", "success", "Saved");
      setEvaluation(null);
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
      >
        {/* Starts at the form's default Marks (100); the two must match on submit. */}
        <AutoEvaluationSetup value={evaluation} onChange={setEvaluation} defaultMarks={100} />
      </AssessmentForm>
    </Modal>
  );
}

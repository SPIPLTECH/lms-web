import api from "@/lib/axios";
import { uploadFileToBlob } from "@/services/blobUpload.service";

export const getAssignments = async (params = {}) => {
  const { data } = await api.get("/assignments", { params });
  return data.data ?? data;
};

export const getAssignmentById = async (assignmentId) => {
  const { data } = await api.get(`/assignments/${assignmentId}`);
  return data.data ?? data;
};

export const submitAssignment = async (
  assignmentId,
  submissionData = {}
) => {
  const { data } = await api.post(
    `/assignments/${assignmentId}/submit`,
    submissionData
  );
  return data.data ?? data;
};

/**
 * Uploads the student's completed assignment PDF to blob storage and returns
 * the descriptor the submit endpoint expects.
 *
 * Uploading is deliberately separate from submitting: the file lands in storage
 * first, and only a successful upload produces the fileUrl that
 * POST /assignments/:id/submit requires. A failed upload therefore cannot
 * record a submission (or move Progress) for a file that isn't there.
 */
export const uploadAssignmentSubmissionFile = async (file) => {
  const uploaded = await uploadFileToBlob(file, { purpose: "assignment-submission" });
  return {
    fileUrl: uploaded.url || uploaded.fileUrl,
    fileName: uploaded.originalName || file.name,
    fileSize: uploaded.size ?? file.size,
    fileType: uploaded.contentType || file.type || "application/pdf",
  };
};

/** Instructor: every student submission for one assignment, with the uploaded PDFs. */
export const getAssignmentSubmissions = async (assignmentId) => {
  const { data } = await api.get(`/assignments/${assignmentId}/submissions`);
  return data.data ?? data;
};

/** Instructor: grade one student submission for an assignment. */
export const gradeAssignmentSubmission = async (assignmentId, submissionId, payload) => {
  const { data } = await api.patch(
    `/assignments/${assignmentId}/submissions/${submissionId}/grade`,
    payload
  );
  return data.data ?? data;
};

/** Instructor-side assignment ("Assessment") CRUD — courseId is optional (all courses if omitted). */
export const getInstructorAssignments = async (courseId) => {
  const url = courseId ? `/assignments?courseId=${courseId}` : "/assignments";
  const { data } = await api.get(url);
  return data.data ?? data;
};

/**
 * Creates an Assignment ENTITY (not a Content cell of type ASSIGNMENT) under
 * exactly one parent — courseId, moduleId, lessonId, topicId, subTopicId or
 * conceptId. The backend gives it its position in that parent's sequence, so
 * no `order` is sent: a Course-level assignment lands after every Module and
 * before every Course Quiz.
 */
export const createAssignment = async (payload) => {
  const { data } = await api.post("/assignments", payload);
  return data.data ?? data;
};

export const updateAssignment = async (assignmentId, payload) => {
  const { data } = await api.put(`/assignments/${assignmentId}`, payload);
  return data.data ?? data;
};

export const deleteAssignment = async (assignmentId) => {
  const { data } = await api.delete(`/assignments/${assignmentId}`);
  return data;
};

/**
 * Batch reorder assignments within a parent scope (two-phase on the backend
 * to avoid swap collisions) — mirrors reorderQuizzes in quiz.service.js.
 */
export const reorderAssignments = async (assignments) => {
  const { data } = await api.patch("/assignments/reorder", { assignments });
  return data;
};

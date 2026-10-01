import api from "@/lib/axios";

export const getContents = async (parent) => {
  const { parentType, parentId } = parent || {};
  const query = parentId ? `?${parentType}Id=${parentId}` : "";
  const response = await api.get(`/contents${query}`);
  return response.data?.data ?? response.data ?? [];
};

/** Instructor-wide contents (no topicId = every topic across the instructor's own courses). */
export const getInstructorContents = async () => {
  const response = await api.get("/contents");
  return response.data?.data ?? response.data ?? [];
};

export const getContentById = async (contentId) => {
  const response = await api.get(`/contents/${contentId}`);
  return response.data;
};

import { uploadFileToBlob } from "./blobUpload.service";

/** Uploads a raw file (PDF/PPT/DOCX/ZIP/Video/Image) directly to Vercel Blob and returns { url, fileUrl, originalName, size }. */
export const uploadFileToVercelBlob = async (file, options = {}) => {
  return await uploadFileToBlob(file, options);
};

/** Uploads a content file directly to Vercel Blob and returns its hosted URL and file metadata. */
export const uploadContentFile = async (file, options = {}) => {
  const result = await uploadFileToBlob(file, options);
  return {
    success: true,
    fileUrl: result.url,
    originalName: result.originalName,
    size: result.size,
    ...result,
  };
};

export const createContent = async (data) => {
  // Ensure order is ALWAYS sent as an integer in the HTTP request payload
  const parsedOrder = Number(data?.order);
  const safeOrder = !isNaN(parsedOrder) && parsedOrder > 0 ? parsedOrder : 1;

  const payload = {
    ...data,
    order: safeOrder,
  };

  const response = await api.post("/contents", payload);
  return response.data;
};

export const updateContent = async (contentId, data) => {
  const response = await api.put(`/contents/${contentId}`, data);
  return response.data;
};

export const deleteContent = async (contentId) => {
  const response = await api.delete(`/contents/${contentId}`);
  return response.data;
};

/** Student: their own submitted PDF for an ASSIGNMENT content block, or null. */
export const getMyContentSubmission = async (contentId) => {
  const response = await api.get(`/contents/${contentId}/submission`);
  return response.data?.data ?? null;
};

/** Student: records an uploaded PDF (from uploadAssignmentSubmissionFile) against an ASSIGNMENT content block. */
export const submitContentAssignment = async (contentId, payload) => {
  const response = await api.post(`/contents/${contentId}/submit`, payload);
  return response.data?.data ?? response.data;
};

/** Instructor: every ASSIGNMENT content block in their own courses, with ungraded counts. */
export const getInstructorAssignmentContents = async () => {
  const response = await api.get("/contents/assignments");
  return response.data?.data ?? [];
};

/** Instructor: student submissions (with uploaded PDFs) for one ASSIGNMENT content block. */
export const getContentSubmissions = async (contentId) => {
  const response = await api.get(`/contents/${contentId}/submissions`);
  return response.data?.data ?? response.data;
};

/** Instructor: grade one student submission for an ASSIGNMENT content block. */
export const gradeContentSubmission = async (contentId, submissionId, payload) => {
  const response = await api.patch(
    `/contents/${contentId}/submissions/${submissionId}/grade`,
    payload
  );
  return response.data?.data ?? response.data;
};

export const reorderContents = async (contents) => {
  const response = await api.patch("/contents/reorder", { contents });
  return response.data;
};

/**
 * Trades the positions of two rows of one parent, whatever their types
 * (`first`/`second` are `{ kind, id }` — a Content with a Lesson, a Quiz with
 * a Topic, …). One backend transaction moves both, which the per-type reorder
 * endpoints cannot do.
 */
export const swapSequenceOrder = async (first, second) => {
  const response = await api.patch("/contents/swap-order", { first, second });
  return response.data;
};
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
  // `order` is a position in the parent's sequence (its content AND its child
  // containers). Send it only to insert at a specific slot; without it the
  // backend appends after everything already in that parent.
  const { order, ...rest } = data || {};
  const parsedOrder = Number(order);
  const payload =
    Number.isInteger(parsedOrder) && parsedOrder > 0 ? { ...rest, order: parsedOrder } : rest;

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

/**
 * Moves items within one parent's learning sequence. `contents` is
 * [{ id, order }]; ids may be Content rows or the parent's child containers
 * (they share the sequence), so the parent is sent along.
 */
export const reorderContents = async (contents, parent = null) => {
  const response = await api.patch("/contents/reorder", {
    contents,
    ...(parent?.parentType && parent?.parentId ? { parentType: parent.parentType, parentId: parent.parentId } : {}),
  });
  return response.data;
};
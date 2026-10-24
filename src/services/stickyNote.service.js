import api from "../lib/axios";

const BASE_URL = "/sticky-notes";

export const getStickyNotes = async (
  lessonId
) => {
  const { data } = await api.get(
    BASE_URL,
    {
      params: lessonId
        ? { lessonId }
        : undefined
    }
  );

  return data.data;
};

export const createStickyNote = async (
  payload
) => {
  const { data } = await api.post(
    BASE_URL,
    payload
  );

  return data.data;
};

export const updateStickyNote = async (
  stickyNoteId,
  payload
) => {
  const { data } = await api.put(
    `${BASE_URL}/${stickyNoteId}`,
    payload
  );

  return data.data;
};

export const deleteStickyNote = async (
  stickyNoteId
) => {
  const { data } = await api.delete(
    `${BASE_URL}/${stickyNoteId}`
  );

  return data;
};

export const toggleStickyNotePin =
  async (stickyNoteId) => {
    const { data } = await api.patch(
      `${BASE_URL}/${stickyNoteId}/pin`
    );

    return data.data;
  };
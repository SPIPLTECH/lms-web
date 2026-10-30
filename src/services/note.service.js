import api from "../lib/axios";

const BASE = "/notes";

export const getNotes = async (params = {}) => {
  const { data } = await api.get(BASE, { params });
  return data.data;
};

export const createNote = async (payload) => {
  const { data } = await api.post(BASE, payload);
  return data.data;
};

export const updateNote = async (noteId, payload) => {
  const { data } = await api.put(`${BASE}/${noteId}`, payload);
  return data.data;
};

export const toggleNoteStar = async (noteId) => {
  const { data } = await api.patch(`${BASE}/${noteId}/star`);
  return data.data;
};

export const deleteNote = async (noteId) => {
  const { data } = await api.delete(`${BASE}/${noteId}`);
  return data;
};

import api from "../lib/axios";

const BASE = "/achievements";

export const getMyAchievements = async () => {
  const { data } = await api.get(`${BASE}/me`);
  return data.data;
};

export const checkAndAwardAchievements = async () => {
  const { data } = await api.post(`${BASE}/check`);
  return data.data;
};

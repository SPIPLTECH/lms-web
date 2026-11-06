import api from "@/lib/axios";

export const submitCourseFeedback = async (courseId, data) => {
  const response = await api.post(`/feedback/courses/${courseId}`, {
    ...data,
    courseId,
  });
  return response.data?.data ?? response.data;
};

export const getMyFeedback = async (courseId) => {
  const response = await api.get(`/feedback/courses/${courseId}/my`);
  return response.data?.data ?? response.data;
};

export const getCourseFeedback = async (courseId) => {
  const response = await api.get(`/feedback/courses/${courseId}`);
  return response.data?.data ?? response.data;
};

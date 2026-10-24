import api from "@/lib/axios";

/**
 * Get paginated repository questions with filters
 * @param {Object} params { search, subject, topic, difficulty, questionType, tags, status, page, limit }
 */
export const getRepositoryQuestions = async (params = {}) => {
  const { data } = await api.get("/questions", { params });
  return data;
};

/**
 * Create manual repository question
 */
export const createRepositoryQuestion = async (questionData) => {
  const { data } = await api.post("/questions", questionData);
  return data;
};

/**
 * Update repository question
 */
export const updateRepositoryQuestion = async (questionId, questionData) => {
  const { data } = await api.put(`/questions/${questionId}`, questionData);
  return data;
};

/**
 * Delete repository question
 */
export const deleteRepositoryQuestion = async (questionId) => {
  const { data } = await api.delete(`/questions/${questionId}`);
  return data;
};

/**
 * Archive repository question
 */
export const archiveRepositoryQuestion = async (questionId) => {
  const { data } = await api.post(`/questions/${questionId}/archive`);
  return data;
};

/**
 * Duplicate repository question
 */
export const duplicateRepositoryQuestion = async (questionId) => {
  const { data } = await api.post(`/questions/${questionId}/duplicate`);
  return data;
};

/**
 * Bulk create questions from a JSON payload, optionally attaching them to a quiz
 * @param {string|null} quizId
 * @param {Array<Object>} questions
 */
export const bulkCreateQuestions = async (quizId, questions) => {
  const { data } = await api.post("/questions/bulk", { quizId, questions });
  return data;
};

/**
 * Bulk upload questions from Excel, CSV, or JSON
 * @param {File} file
 */
export const uploadQuestionsFile = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post("/questions/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return data;
};

/**
 * Import questions from repository into a quiz
 * @param {string} quizId 
 * @param {Array<string>} questionIds 
 */
export const importQuestionsToQuiz = async (quizId, questionIds) => {
  const { data } = await api.post(`/quizzes/${quizId}/import-questions`, {
    questionIds,
  });

  return data;
};

/**
 * Remove question link from quiz
 */
export const removeQuestionFromQuiz = async (quizId, questionId) => {
  const { data } = await api.delete(`/quizzes/${quizId}/questions/${questionId}`);
  return data;
};

/**
 * Reorder quiz questions
 */
export const reorderQuizQuestions = async (quizId, orderedQuestionIds) => {
  const { data } = await api.put(`/quizzes/${quizId}/questions/reorder`, {
    orderedQuestionIds,
  });

  return data;
};

/**
 * Update question marks in quiz
 */
export const updateQuizQuestionMarks = async (quizId, questionId, marks) => {
  const { data } = await api.put(`/quizzes/${quizId}/questions/${questionId}/marks`, {
    marks,
  });

  return data;
};

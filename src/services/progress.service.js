import api from "@/lib/axios";

/**
 * Mark a content item as complete or incomplete
 */
export const markContentComplete = async (contentId, completed = true) => {
  const { data } = await api.post("/progress/content-complete", {
    contentId,
    completed
  });
  return data.data ?? data;
};

/**
 * Same as markContentComplete, but for every Content row a single merged
 * player block stands for (see groupLessonContentForDocumentView) — one
 * request instead of one per row, so the backend recomputes the course's
 * progress roll-up once instead of once per id racing the others.
 */
export const markContentCompleteBatch = async (contentIds, completed = true) => {
  const { data } = await api.post("/progress/content-complete", {
    contentIds,
    completed
  });
  return data.data ?? data;
};

/**
 * Marks a Content/Quiz/Assignment/Topic/Lesson/Module as visited — drives
 * "Continue Learning" resume tracking. Pass exactly one of the entity ids
 * (contentId, quizId, assignmentId, topicId, lessonId, moduleId), matching
 * markVisitedSchema on the backend.
 */
export const markVisited = async (params) => {
  const { data } = await api.post("/progress/visit", { visited: true, ...params });
  return data.data ?? data;
};

/**
 * THE learning sequence of a course for the signed-in student: every Content
 * item — ordinary content, quizzes and assignments — as one ordered list of
 * steps, with the course tree the Course Map draws from those same steps.
 * Each step says whether it is complete, visited and locked; a locked step
 * carries no material. The player's Prev/Next, the Course Map and resume all
 * read this, so they cannot disagree. Returns
 * { courseId, title, progress, steps, tree, currentIndex, resumeIndex }.
 * With `includePath`, also `learningPath` — { path, nextItem, lockedCount,
 * skippableCount }, GET /progress/learning-path's shape — built from the same
 * server roll-up (one request instead of two). `path` is every
 * module/lesson/topic in course order with its status (COMPLETED / QUALIFIED
 * / CURRENT / AVAILABLE / LOCKED) and the qualifying test on offer, if any.
 */
export const getLearningSequence = async (courseId, studentId = null, { includePath = false } = {}) => {
  const { data } = await api.get("/progress/learning-sequence", {
    params: { courseId, ...(studentId && { studentId }), ...(includePath && { include: "path" }) },
  });
  return data.data ?? data;
};


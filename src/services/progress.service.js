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
 * Mark a lesson (and all its topic contents) as complete or incomplete
 */
export const completeLesson = async (lessonId, completed = true) => {
  const { data } = await api.post("/progress/complete", {
    lessonId,
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
 * Fetch detailed progress for a course (Student or Instructor viewing a student)
 */
export const getCourseProgress = async (courseId, studentId = null) => {
  const url = studentId ? `/progress/courses/${courseId}?studentId=${studentId}` : `/progress/courses/${courseId}`;
  const { data } = await api.get(url);
  return data.data ?? data;
};

/**
 * The student's ordered path through a course: every module/lesson/topic in
 * course order, each with its status (COMPLETED / QUALIFIED / CURRENT /
 * AVAILABLE / LOCKED) and the qualifying test on offer where one exists.
 *
 * The server decides all of it — this is the same computation the API
 * enforces on access, so the player never has to derive locking itself.
 * Returns { path, nextItem, lockedCount, skippableCount }.
 */
export const getLearningPath = async (courseId, studentId = null) => {
  const { data } = await api.get("/progress/learning-path", {
    params: { courseId, ...(studentId && { studentId }) },
  });
  return {
    path: data.data ?? [],
    nextItem: data.nextItem ?? null,
    lockedCount: data.lockedCount ?? 0,
    skippableCount: data.skippableCount ?? 0,
  };
};

/**
 * Fetch overall progress across enrolled courses (Student or Instructor viewing a student)
 */
export const getOverallProgress = async (studentId = null) => {
  const url = studentId ? `/progress?studentId=${studentId}` : "/progress";
  const { data } = await api.get(url);
  return data.data ?? data;
};

/**
 * Fetch read-only course progress analytics for Instructors
 */
export const getInstructorCourseProgress = async (courseId) => {
  const { data } = await api.get(`/progress/instructor/courses/${courseId}`);
  return data.data ?? data;
};

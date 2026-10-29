import { useQuery } from "@tanstack/react-query";

import { getLearningSequence } from "@/services/progress.service";

import { QUERY_KEYS } from "@/constants/queryKeys";
import { defaultQueryOptions } from "@/lib/queryOptions";

/**
 * THE learning sequence of a course: every Content item (ordinary content,
 * quizzes, assignments) as one ordered list of steps, plus the course tree
 * the Course Map draws from the same steps. Prev/Next, the Course Map, resume
 * and the completion strip all read this one query, so they cannot disagree
 * about what comes next or what is done — and none of them computes
 * completion or locking itself: the server's flags are the answer.
 *
 * Refetched on mount for the same reason the learning path is: a completion,
 * a quiz attempt or a submission moves the locks, and the player remounts
 * around those events.
 *
 * `withPath` also brings the learning path (`data.learningPath`, the shape
 * useLearningPath returns) in the same request. Cached under its own key so a
 * sequence fetched without it is never served where the path is expected;
 * invalidating [LEARNING_SEQUENCE] still refreshes both.
 *
 * A 403 (not enrolled) is not retried — asking again cannot change it.
 */
export default function useLearningSequence(courseId, { studentId = null, enabled = true, withPath = false } = {}) {
  return useQuery({
    queryKey: withPath
      ? [QUERY_KEYS.LEARNING_SEQUENCE, courseId, studentId, "with-path"]
      : [QUERY_KEYS.LEARNING_SEQUENCE, courseId, studentId],
    queryFn: () => getLearningSequence(courseId, studentId, { includePath: withPath }),
    enabled: Boolean(courseId) && enabled,
    ...defaultQueryOptions,
    retry: (failureCount, error) =>
      error?.response?.status !== 403 && failureCount < defaultQueryOptions.retry,
    refetchOnMount: true,
  });
}

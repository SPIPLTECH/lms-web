import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyFeedback, submitCourseFeedback, getCourseFeedback } from "@/services/feedback.service";
import { defaultQueryOptions } from "@/lib/queryOptions";

export const FEEDBACK_QUERY_KEYS = {
  MY_FEEDBACK: (courseId) => ["feedback", "my", courseId],
  COURSE_FEEDBACK: (courseId) => ["feedback", "course", courseId],
};

export function useMyFeedback(courseId) {
  return useQuery({
    queryKey: FEEDBACK_QUERY_KEYS.MY_FEEDBACK(courseId),
    queryFn: () => getMyFeedback(courseId),
    enabled: !!courseId,
    ...defaultQueryOptions,
  });
}

export function useCourseFeedback(courseId) {
  return useQuery({
    queryKey: FEEDBACK_QUERY_KEYS.COURSE_FEEDBACK(courseId),
    queryFn: () => getCourseFeedback(courseId),
    enabled: !!courseId,
    ...defaultQueryOptions,
  });
}

export function useSubmitFeedback(courseId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => submitCourseFeedback(courseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: FEEDBACK_QUERY_KEYS.MY_FEEDBACK(courseId),
      });
      queryClient.invalidateQueries({
        queryKey: FEEDBACK_QUERY_KEYS.COURSE_FEEDBACK(courseId),
      });
    },
  });
}


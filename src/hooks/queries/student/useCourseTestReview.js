import { useQuery } from "@tanstack/react-query";

import { getCourseTestReview } from "@/services/quiz.service";

import { QUERY_KEYS } from "@/constants/queryKeys";
import { defaultQueryOptions } from "@/lib/queryOptions";

/**
 * The student's test-series review for a course: progress until every Final
 * quiz is submitted, then the full review. Data is null for a course without
 * the review switched on. useSubmitQuiz invalidates it.
 */
export default function useCourseTestReview(courseId, { enabled = true } = {}) {
    return useQuery({
        queryKey: [QUERY_KEYS.COURSE_TEST_REVIEW, courseId],
        queryFn: () => getCourseTestReview(courseId),
        enabled: !!courseId && enabled,
        ...defaultQueryOptions,
        refetchOnMount: true,
    });
}

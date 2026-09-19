import { useQuery } from "@tanstack/react-query";

import { getNextAction } from "@/services/learnerModel.service";

import { QUERY_KEYS } from "@/constants/queryKeys";
import { defaultQueryOptions } from "@/lib/queryOptions";

/**
 * The student's next action for one course.
 *
 * One request, not a fan-out: the backend already aggregates the learning
 * path, the decision engine and the qualification state behind this.
 */
export default function useNextAction(courseId, { quizId = null } = {}) {
    return useQuery({
        // quizId is part of the key: the result page asks the same question in
        // the context of the quiz just submitted, and that is a different
        // answer from the course-wide one the dashboard and player show.
        queryKey: [QUERY_KEYS.NEXT_ACTION, courseId ?? null, quizId ?? null],
        queryFn: () => getNextAction(courseId, { quizId }),
        enabled: Boolean(courseId),
        ...defaultQueryOptions,
        // Finishing content, passing a qualifying test or submitting a quiz all
        // move this — the surfaces that show it remount around those events.
        refetchOnMount: true,
    });
}

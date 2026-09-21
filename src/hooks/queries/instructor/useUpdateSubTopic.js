import {
    useMutation,
    useQueryClient,
} from "@tanstack/react-query";

import { updateSubTopic } from "@/services/subTopic.service";
import { QUERY_KEYS } from "@/constants/queryKeys";

/**
 * Everything a SubTopic create/update/delete/reorder can change. refetchType
 * "all" mirrors the Topic hooks: the Course Map's lazily-loaded SubTopic list
 * may not have a mounted observer when the mutation runs from the modal.
 * COURSE carries the student tree and the instructor's quiz source.
 */
export function invalidateSubTopicQueries(queryClient, topicId) {
    queryClient.invalidateQueries({
        queryKey: topicId ? [QUERY_KEYS.SUBTOPICS, topicId] : [QUERY_KEYS.SUBTOPICS],
        refetchType: "all",
    });

    queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.MODULES],
        refetchType: "all",
    });

    queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.COURSE],
    });

    queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.INSTRUCTOR_COURSES],
        refetchType: "all",
    });
}

export function useUpdateSubTopic() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
                         subTopicId,
                         subTopicData,
                     }) =>
            updateSubTopic(
                subTopicId,
                subTopicData
            ),

        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: [
                    QUERY_KEYS.SUBTOPIC,
                    variables.subTopicId,
                ],
                refetchType: "all",
            });

            invalidateSubTopicQueries(queryClient, variables.topicId);
        },
    });
}

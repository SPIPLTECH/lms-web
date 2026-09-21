import {
    useMutation,
    useQueryClient,
} from "@tanstack/react-query";

import { deleteSubTopic } from "@/services/subTopic.service";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { invalidateSubTopicQueries } from "./useUpdateSubTopic";

export function useDeleteSubTopic() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ subTopicId }) =>
            deleteSubTopic(subTopicId),

        onSuccess: (_, variables) => {
            queryClient.removeQueries({
                queryKey: [
                    QUERY_KEYS.SUBTOPIC,
                    variables.subTopicId,
                ],
            });

            // The backend removes the SubTopic's contents and concepts with it.
            queryClient.invalidateQueries({
                queryKey: [
                    QUERY_KEYS.CONTENTS,
                    "subTopic",
                    variables.subTopicId,
                ],
            });

            queryClient.invalidateQueries({
                queryKey: [
                    QUERY_KEYS.CONCEPTS,
                    variables.subTopicId,
                ],
            });

            invalidateSubTopicQueries(queryClient, variables.topicId);
        },
    });
}

import {
    useMutation,
    useQueryClient,
} from "@tanstack/react-query";

import { createSubTopic } from "@/services/subTopic.service";
import { invalidateSubTopicQueries } from "./useUpdateSubTopic";

export function useCreateSubTopic() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createSubTopic,

        onSuccess: (_, variables) => {
            invalidateSubTopicQueries(queryClient, variables.topicId);
        },
    });
}

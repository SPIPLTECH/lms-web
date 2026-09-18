import {
    useMutation,
    useQueryClient,
} from "@tanstack/react-query";

import {updateContent} from "@/services/content.service";
import {QUERY_KEYS} from "@/constants/queryKeys";
import { parentFromIdFields } from "./useCreateContent";

export function useUpdateContent() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
                         contentId,
                         contentData,
                     }) =>
            updateContent(
                contentId,
                contentData
            ),

        onSuccess: (_, variables) => {
            const [fallbackType, fallbackId] = parentFromIdFields(variables.contentData);
            const parentType = variables.parent?.parentType ?? fallbackType;
            const parentId = variables.parent?.parentId ?? fallbackId;

            queryClient.invalidateQueries({
                queryKey: [
                    QUERY_KEYS.CONTENT,
                    variables.contentId,
                ],
                refetchType: "all",
            });

            queryClient.invalidateQueries({
                queryKey: [
                    QUERY_KEYS.CONTENTS,
                    parentType,
                    parentId,
                ],
                refetchType: "all",
            });

            queryClient.invalidateQueries({
                queryKey: [QUERY_KEYS.COURSE],
            });
        },
    });
}

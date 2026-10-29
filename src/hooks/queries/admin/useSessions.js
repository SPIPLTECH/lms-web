import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getUserSessions, revokeSession } from "@/services/session.service";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { defaultQueryOptions } from "@/lib/queryOptions";

/**
 * A user's recent sign-in sessions (ADMIN).
 */
export function useUserSessions(userId) {
    return useQuery({
        queryKey: [QUERY_KEYS.ADMIN_USER_SESSIONS, userId],
        queryFn: () => getUserSessions(userId),
        enabled: !!userId,
        ...defaultQueryOptions,
    });
}

/**
 * Audited revocation of one session (ADMIN). Ends it and its playback lease,
 * freeing the account's single sign-in slot.
 */
export function useRevokeSession(userId) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (sessionId) => revokeSession(sessionId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_USER_SESSIONS, userId] });
        },
    });
}

import {
    useQuery,
    useMutation,
    useQueryClient,
} from "@tanstack/react-query";

import {
    getUsers,
    updateUserRole,
    deleteUser,
} from "@/services/user.service";

import { QUERY_KEYS } from "@/constants/queryKeys";
import { defaultQueryOptions } from "@/lib/queryOptions";

/**
 * Get All Users
 */
export function useUsers() {
    return useQuery({
        queryKey: [QUERY_KEYS.ADMIN_USERS],
        queryFn: getUsers,
        ...defaultQueryOptions,
    });
}

/**
 * Update User Role
 */
export function useUpdateUserRole() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ userId, role }) =>
            updateUserRole(userId, role),

        onSuccess: () => {
            // A role change moves the user between the Students/Instructors
            // lists (and the Admin list), so every one of those views needs
            // to refetch even if it isn't the actively-mounted query.
            queryClient.invalidateQueries({
                queryKey: [QUERY_KEYS.ADMIN_USERS],
                refetchType: "all",
            });

            queryClient.invalidateQueries({
                queryKey: [QUERY_KEYS.ADMIN_USER],
                refetchType: "all",
            });

            queryClient.invalidateQueries({
                queryKey: [QUERY_KEYS.ADMIN_STUDENTS],
                refetchType: "all",
            });

            queryClient.invalidateQueries({
                queryKey: [QUERY_KEYS.ADMIN_INSTRUCTORS],
                refetchType: "all",
            });
        },
    });
}

/**
 * Delete User
 */
export function useDeleteUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteUser,

        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [QUERY_KEYS.ADMIN_USERS],
            });
        },
    });
}
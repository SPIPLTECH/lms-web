import { useQuery } from "@tanstack/react-query";

import { getInstructors } from "@/services/instructor.service";

import {QUERY_KEYS} from "@/constants/queryKeys";
import {defaultQueryOptions} from "@/lib/queryOptions";

/**
 * Get All Instructors
 */
export function useInstructors() {
    return useQuery({
        queryKey: [
            QUERY_KEYS.ADMIN_INSTRUCTORS,
        ],
        queryFn: getInstructors,
        ...defaultQueryOptions,
    });
}

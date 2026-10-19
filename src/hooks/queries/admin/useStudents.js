import { useQuery } from "@tanstack/react-query";

import {
    getStudents,
    getStudentById,
} from "@/services/student.service";

import {QUERY_KEYS} from "@/constants/queryKeys";
import {defaultQueryOptions} from "@/lib/queryOptions";

/**
 * Get All Students
 */
export function useStudents() {
    return useQuery({
        queryKey: [QUERY_KEYS.ADMIN_STUDENTS],
        queryFn: getStudents,
        ...defaultQueryOptions,
    });
}

/**
 * Get Student By ID
 */
export function useStudent(studentId) {
    return useQuery({
        queryKey: [
            QUERY_KEYS.ADMIN_STUDENT,
            studentId,
        ],
        queryFn: () =>
            getStudentById(studentId),
        enabled: !!studentId,
        ...defaultQueryOptions,
    });
}


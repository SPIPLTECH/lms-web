import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    dismissNudge,
    getCareerRoles,
    getMyCareer,
    getMyMotivation,
    getMyStudyPlan,
    setCareerGoal,
} from "@/services/adaptiveAgents.service";

import { QUERY_KEYS } from "@/constants/queryKeys";
import { defaultQueryOptions } from "@/lib/queryOptions";

/** Motivation agent: streak + nudges for the signed-in student. */
export function useMotivation() {
    return useQuery({
        queryKey: [QUERY_KEYS.MOTIVATION],
        queryFn: getMyMotivation,
        ...defaultQueryOptions,
    });
}

export function useDismissNudge() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: dismissNudge,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MOTIVATION] }),
    });
}

/** Learning Path agent: this week's study plan for one course. */
export function useStudyPlan(courseId) {
    return useQuery({
        queryKey: [QUERY_KEYS.STUDY_PLAN, courseId ?? null],
        queryFn: () => getMyStudyPlan(courseId),
        enabled: Boolean(courseId),
        ...defaultQueryOptions,
    });
}

/** Career Guidance agent. */
export function useCareer() {
    return useQuery({
        queryKey: [QUERY_KEYS.CAREER],
        queryFn: getMyCareer,
        ...defaultQueryOptions,
    });
}

export function useCareerRoles() {
    return useQuery({
        queryKey: [QUERY_KEYS.CAREER_ROLES],
        queryFn: getCareerRoles,
        ...defaultQueryOptions,
        staleTime: 1000 * 60 * 60,
    });
}

export function useSetCareerGoal() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: setCareerGoal,
        onSuccess: (data) => queryClient.setQueryData([QUERY_KEYS.CAREER], data),
    });
}

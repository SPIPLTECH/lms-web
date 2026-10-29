import { useQuery } from "@tanstack/react-query";

import {
    getAdminIntelligence,
    getCourseAnalyticsList,
    getPlatformAnalytics,
} from "@/services/adaptiveAgents.service";

import { QUERY_KEYS } from "@/constants/queryKeys";
import { defaultQueryOptions } from "@/lib/queryOptions";

/** Analytics agent: platform metrics today + a 30-day trend. */
export function usePlatformAnalytics() {
    return useQuery({
        queryKey: [QUERY_KEYS.ADMIN_ANALYTICS_PLATFORM],
        queryFn: getPlatformAnalytics,
        ...defaultQueryOptions,
    });
}

/** Analytics agent: today's metrics for every course. */
export function useCourseAnalyticsList() {
    return useQuery({
        queryKey: [QUERY_KEYS.ADMIN_ANALYTICS_COURSES],
        queryFn: getCourseAnalyticsList,
        ...defaultQueryOptions,
    });
}

/** Admin Intelligence agent: institution health, alerts, departments, faculty. */
export function useAdminIntelligence() {
    return useQuery({
        queryKey: [QUERY_KEYS.ADMIN_INTELLIGENCE],
        queryFn: getAdminIntelligence,
        ...defaultQueryOptions,
    });
}

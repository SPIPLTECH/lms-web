'use client';

import { useQuery } from '@tanstack/react-query';
import { getInstructorDashboard } from '@/services/dashboard.service';
import { getNotifications } from '@/services/notification.service';

const defaultOptions = {
  staleTime: 1000 * 60 * 5, // 5 minutes fresh time
  gcTime: 1000 * 60 * 30, // 30 minutes cache duration
  refetchOnWindowFocus: false,
  placeholderData: (prev) => prev, // Caches previous data while refetching to avoid layout shift
};

// Hook for dashboard KPIs
export function useDashboardKPIs(courseId) {
  return useQuery({
    queryKey: ['instructorDashboard', courseId],
    queryFn: () => getInstructorDashboard(courseId),
    select: (data) => data?.kpis ?? [],
    ...defaultOptions,
  });
}

// Hook for student engagement trends
export function useStudentEngagement(courseId) {
  return useQuery({
    queryKey: ['instructorDashboard', courseId],
    queryFn: () => getInstructorDashboard(courseId),
    select: (data) => data?.studentEngagement ?? [],
    ...defaultOptions,
  });
}

// Hook for recent activity summary
export function useRecentActivity(courseId) {
  return useQuery({
    queryKey: ['instructorDashboard', courseId],
    queryFn: () => getInstructorDashboard(courseId),
    select: (data) => data?.summary ?? [],
    ...defaultOptions,
  });
}

// Hook for the drop-down course options
export function useInstructorCourses(courseId) {
  return useQuery({
    queryKey: ['instructorDashboard', courseId],
    queryFn: () => getInstructorDashboard(courseId),
    select: (data) => data?.courses ?? [],
    ...defaultOptions,
  });
}

// Hook for dynamic live notifications
export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    staleTime: 1000 * 60 * 2, // 2 minutes fresh time
    gcTime: 1000 * 60 * 15,
    placeholderData: (prev) => prev,
  });
}
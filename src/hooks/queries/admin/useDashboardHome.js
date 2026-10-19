import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { defaultQueryOptions } from "@/lib/queryOptions";
import { getCertificates } from "@/services/certificate.service";
import {
  deriveAdminReviewQueue,
  deriveRecentActivity,
} from "@/services/admin/dashboardHome.service";
import { useEnrollments } from "./useEnrollments";
import { getAllCoursesForReview } from "@/services/course.service";

const useRawCertificates = () =>
  useQuery({
    queryKey: ["admin-home", "raw", "certificates"],
    queryFn: getCertificates,
    ...defaultQueryOptions,
  });

export function useRecentActivity() {
  const enrollments = useEnrollments();
  const certificates = useRawCertificates();
  const isLoading = enrollments.isLoading || certificates.isLoading;
  const data = useMemo(
    () => deriveRecentActivity(enrollments.data, certificates.data),
    [enrollments.data, certificates.data]
  );
  return { data, isLoading };
}

/**
 * The admin Home action queue.
 *
 * Uses getAllCoursesForReview rather than the shared [ADMIN_COURSES] query:
 * that one inherits GET /courses' default limit of 10, and a queue that counts
 * "published courses with no valid price" across only the first ten courses is
 * worse than no queue at all.
 */
export function useAdminReviewQueue() {
  const courses = useQuery({
    queryKey: ["admin-home", "review-queue", "courses"],
    queryFn: getAllCoursesForReview,
    ...defaultQueryOptions,
  });
  const data = useMemo(() => deriveAdminReviewQueue(courses.data), [courses.data]);
  return { data, isLoading: courses.isLoading };
}

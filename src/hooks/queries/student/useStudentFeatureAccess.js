import { useQuery } from "@tanstack/react-query";

import { getMyEnrollments } from "@/services/enrollment.service";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { defaultQueryOptions } from "@/lib/queryOptions";
import { isBoardPaperOnlyStudent } from "@/lib/studentFeatures";

/**
 * Whether this student sees Submissions and Certificates (lib/studentFeatures.js).
 * Shares useMyCourses' query, so it costs no extra request. `enabled: false`
 * (a shared component rendered for a non-student) skips the query and shows both.
 * Until the enrolments arrive both are shown.
 */
export default function useStudentFeatureAccess({ enabled = true } = {}) {
  const { data } = useQuery({
    queryKey: [QUERY_KEYS.MY_COURSES],
    queryFn: getMyEnrollments,
    ...defaultQueryOptions,
    enabled,
  });
  const boardPaperOnly = enabled && isBoardPaperOnlyStudent(data);
  return { showSubmissions: !boardPaperOnly, showCertificates: !boardPaperOnly };
}

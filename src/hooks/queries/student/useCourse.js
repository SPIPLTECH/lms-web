import {useQuery} from "@tanstack/react-query";

import {QUERY_KEYS} from "@/constants/queryKeys";
import {defaultQueryOptions} from "@/lib/queryOptions";
import {getCourseById} from "@/services/course.service";

/**
 * `shallow: true` fetches course-level data only (GET /courses/:id?include=meta)
 * — for views that show the course's title/language but not its syllabus.
 * The full tree is ~300 KB on a large course and several times slower.
 * Shallow and full results are cached under different keys (as in
 * useInstructorCourse), so a view that needs the tree never gets metadata only.
 */
export default function useCourse(courseId, { shallow = false } = {}) {
    return useQuery({
        queryKey: shallow ? [QUERY_KEYS.COURSE, courseId, "meta"] : [QUERY_KEYS.COURSE, courseId],
        queryFn: () => getCourseById(courseId, { shallow }),
        enabled: !!courseId,
        ...defaultQueryOptions,
    });
}

import {useQuery} from "@tanstack/react-query";

import {QUERY_KEYS} from "@/constants/queryKeys";
import {defaultQueryOptions} from "@/lib/queryOptions";
import {getCourseById} from "@/services/course.service";

export default function useCourse(courseId) {
    return useQuery({
        queryKey: [QUERY_KEYS.COURSE, courseId],
        queryFn: () => getCourseById(courseId),
        enabled: !!courseId,
        ...defaultQueryOptions,
    });
}

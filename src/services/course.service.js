import api from "@/lib/axios";

/**
 * Get All Courses
 */
export const getCourses = async () => {
    try {
        const {data} = await api.get("/courses");
        return data.data ?? data;
    } catch (error) {
        throw error;
    }
};

/**
 * Every published course for the student Store, with pricing included.
 * GET /courses defaults to limit=10 (pagination for the admin/instructor
 * table views) -- the Store needs the full catalog, so this requests a
 * generously high limit explicitly instead of reusing getCourses() above.
 */
export const getStoreCourses = async () => {
    const {data} = await api.get("/courses?limit=200&status=PUBLISHED&sortBy=newest");
    return data.data ?? data;
};

/** Real status-breakdown counts (total/published/draft/archived) for the My Courses summary cards. */
export const getCourseStatusCounts = async () => {
    const { data } = await api.get("/courses/stats/mine");
    return data.data ?? data;
};

/**
 * Every course on the platform, for the admin Home review queue.
 *
 * getCourses() above hits the same endpoint but inherits its default
 * limit of 10, so counting "published courses with no valid price" from it
 * would silently only ever inspect the first ten. The queue has to see the
 * whole catalogue to be true, so the limit is raised explicitly here — the
 * same approach getStoreCourses() takes for the student Store.
 */
export const getAllCoursesForReview = async () => {
    const { data } = await api.get("/courses?limit=500");
    return data.data ?? [];
};

/**
 * One page of GET /courses, with its pagination block.
 *
 * Shared by every caller that drives a server-paginated course list (the
 * instructor My Courses table, the instructor Browse catalogue, the public
 * catalogue) so the querystring building and the `{ courses, pagination }`
 * shape live in exactly one place.
 */
const getCoursesPage = async (filters = {}, config = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            params.set(key, value);
        }
    });

    const { data } = await api.get(`/courses?${params.toString()}`, config);
    return {
        courses: data.data ?? [],
        pagination: data.pagination ?? { page: 1, limit: 10, total: data.data?.length ?? 0, totalPages: 1 },
    };
};

/**
 * Get instructor's courses for the My Courses table/grid — server-side
 * search, filter, sort, and pagination. Kept separate from getCourses()
 * above since that function is used everywhere expecting a flat unpaginated
 * array; this one returns { courses, pagination } for this page only.
 */
export const getInstructorCoursesTable = async (filters = {}, config = {}) => getCoursesPage(filters, config);

/**
 * One page of the PUBLIC published catalogue, for the guest-facing /courses
 * route. No token is attached for a signed-out visitor and none is needed:
 * GET /courses runs behind optionalToken, and for a GUEST (or STUDENT) the
 * backend forces `status = PUBLISHED` itself and ignores any status the
 * client sends — so drafts and archived courses can never come back here.
 *
 * `status: "PUBLISHED"` is still sent explicitly so a signed-in ADMIN or
 * INSTRUCTOR browsing this public page sees the same published-only
 * catalogue a guest does, rather than their own drafts.
 */
export const getPublicCourses = async (filters = {}, config = {}) =>
    getCoursesPage({ ...filters, status: "PUBLISHED" }, config);

/**
 * Get Course By ID.
 *
 * @param {string}  courseId
 * @param {object}  [options]
 * @param {boolean} [options.shallow=false]
 *   Request course-level data only (no modules -> lessons -> topics -> contents
 *   tree, no per-level quiz questions). Use it wherever the view renders course
 *   metadata but not the syllabus — the full tree carries every content cell
 *   body and every quiz answer key. Defaults to the full payload.
 */
export const getCourseById = async (
    courseId,
    { shallow = false } = {}
) => {
    try {
        const { data } = await api.get(
            `/courses/${courseId}${shallow ? "?include=meta" : ""}`
        );
        return data.data ?? data;
    } catch (error) {
        throw error;
    }
};

/**
 * Create Course
 */
export const createCourse = async (
    courseData
) => {
    const {data} = await api.post(
        "/courses",
        courseData
    );

    return data;
};

/**
 * Update Course
 */
export const updateCourse = async (
    courseId,
    courseData
) => {
    const {data} = await api.put(
        `/courses/${courseId}`,
        courseData
    );

    return data;
};

/**
 * Delete Course
 */
export const deleteCourse = async (
    courseId
) => {
    if (courseId === "draft" || courseId === "new") {
        if (typeof window !== "undefined") {
            sessionStorage.removeItem("imported_course_draft");
        }
        return { success: true, message: "Course draft discarded locally" };
    }

    const {data} = await api.delete(
        `/courses/${courseId}`
    );

    return data;
};

/**
 * Publish Course
 */
export const publishCourse = async (courseId) => {
    const { data } = await api.post(`/courses/${courseId}/publish`);
    return data;
};

/**
 * Unpublish Course
 */
export const unpublishCourse = async (courseId) => {
    const { data } = await api.post(`/courses/${courseId}/unpublish`);
    return data;
};

/**
 * Archive Course
 */
export const archiveCourse = async (courseId) => {
    const { data } = await api.post(`/courses/${courseId}/archive`);
    return data;
};

/**
 * Restore Archived Course to DRAFT
 */
export const restoreCourse = async (courseId) => {
    const { data } = await api.post(`/courses/${courseId}/restore`);
    return data;
};

/**
 * Update Course Status
 */
export const updateCourseStatus = async (
    courseId,
    status
) => {
    const {data} = await api.patch(
        `/courses/${courseId}/status`,
        {status}
    );

    return data;
};

/**
 * Duplicate Course
 */
export const duplicateCourse = async (
    courseId
) => {
    const {data} = await api.post(
        `/courses/${courseId}/duplicate`
    );

    return data;
};

/**
 * Get Students Enrolled In A Course (with real per-student progress/avgGrade)
 */
export const getCourseStudents = async (
    courseId
) => {
    const {data} = await api.get(
        `/courses/${courseId}/students`
    );

    return data.data ?? data;
};

/**
 * Get Batches For A Single Course
 */
export const getCourseBatches = async (courseId) => {
    const { data } = await api.get(`/courses/${courseId}/batches`);
    return data.data ?? data;
};

/**
 * Get All Batches Across The Instructor's Courses (with optional filters)
 */
export const getMyBatches = async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.courseId) params.set("courseId", filters.courseId);
    if (filters.status) params.set("status", filters.status);
    if (filters.startDate) params.set("startDate", filters.startDate);
    if (filters.endDate) params.set("endDate", filters.endDate);

    const { data } = await api.get(`/courses/batches/mine?${params.toString()}`);
    return data.data ?? data;
};

/**
 * Create A Batch For A Course
 */
export const createCourseBatch = async (courseId, batchData) => {
    const { data } = await api.post(`/courses/${courseId}/batches`, batchData);
    return data.data ?? data;
};

/**
 * Export Course ZIP package
 */
export const exportCourse = async (courseId) => {
    return api.get(`/courses/${courseId}/export`, {
        responseType: "blob"
    });
};

/**
 * Track Course View — updates lastViewedAt on the instructor's own course.
 * Fire-and-forget: call whenever an instructor opens a course in the Composer.
 */
export const trackCourseView = async (courseId) => {
    try {
        const { data } = await api.patch(`/courses/${courseId}/view`);
        return data;
    } catch {
        // Non-critical — silently ignore failures
    }
};

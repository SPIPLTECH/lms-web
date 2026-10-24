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

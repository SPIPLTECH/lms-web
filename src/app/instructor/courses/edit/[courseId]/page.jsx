"use client";

import {useEffect, useState} from "react";
import {useParams, useRouter} from "next/navigation";

import Card from "@/components/ui/Card";
import Loader from "@/components/common/Loader";
import CourseForm from "@/components/courses/CourseForm";

import {useInstructorCourse} from "@/hooks/queries/instructor/useInstructorCourse";
import useInstructorCourseKey from "@/hooks/queries/instructor/useInstructorCourseKey";
import {useUpdateCourse} from "@/hooks/queries/instructor/useUpdateCourse";

export default function EditCoursePage() {
    // The URL names the course by its readable key (`urlKey`) or, in an older
    // link, by its id.
    const params = useParams();
    const {
        courseId,
        isResolving: courseKeyResolving,
        notFound: courseKeyNotFound,
    } = useInstructorCourseKey(params.courseId);

    const router = useRouter();
    const [submitError, setSubmitError] = useState("");

    // This form edits course-level fields only (title, description, status,
    // category…) and never touches the syllabus, so it does not need the
    // modules -> lessons -> topics -> contents tree.
    const {
        data: course,
        isLoading,
        isError,
    } = useInstructorCourse(courseId, { shallow: true });

    // Show the course by its readable key, whatever link opened this form.
    // history.replaceState: not a navigation; Next.js keeps its router state.
    useEffect(() => {
        if (typeof window === "undefined" || !course?.urlKey) return;
        const path = `/instructor/courses/edit/${encodeURIComponent(course.urlKey)}`;
        if (window.location.pathname !== path) {
            window.history.replaceState(null, "", `${path}${window.location.search}`);
        }
    }, [course?.urlKey]);

    const updateCourseMutation =
        useUpdateCourse();

    const handleSubmit = async (
        values
    ) => {
        setSubmitError("");
        try {
            await updateCourseMutation.mutateAsync({
                courseId,
                courseData: values,
            });

            router.push(
                `/instructor/courses/${courseId}`
            );
        } catch (error) {
            setSubmitError(
                error.response?.data?.message || "Failed to update course. Please try again."
            );
        }
    };

    if (courseKeyResolving || isLoading) {
        return (
            <div className="flex justify-center py-20">
                <Loader/>
            </div>
        );
    }

    if (courseKeyNotFound || isError || !course) {
        return (
            <Card>
                <div className="py-16 text-center">
                    <h2 className="text-2xl font-semibold">
                        Course Not Found
                    </h2>

                    <p className="mt-2 text-muted-foreground">
                        Unable to load the course.
                    </p>
                </div>
            </Card>
        );
    }

    return (
        <CourseForm
            mode="edit"
            initialValues={{
                ...course,
                status:
                    course.status || "DRAFT",
            }}
            loading={
                updateCourseMutation.isPending
            }
            onSubmit={handleSubmit}
            onCancel={() =>
                router.push(
                    `/instructor/courses/${encodeURIComponent(course.urlKey || courseId)}`
                )
            }
            submitError={submitError}
        />
    );
}
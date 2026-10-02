"use client";

import {useParams, useRouter} from "next/navigation";

import Loader from "@/components/common/Loader";
import LessonForm from "@/components/instructor/lessons/LessonForm";
import {useToast} from "@/components/ui/ToastProvider";

import {useLessons} from "@/hooks/queries/instructor/useLessons";
import {useModule} from "@/hooks/queries/instructor/useModule";
import {useCreateLesson} from "@/hooks/queries/instructor/useCreateLesson";

export default function CreateLessonPage() {
    const {moduleId} = useParams();
    const router = useRouter();
    const {showToast} = useToast();

    const createLessonMutation = useCreateLesson();

    const {isLoading: lessonsLoading} = useLessons(moduleId);

    const {data: moduleData, isLoading: moduleLoading} = useModule(moduleId);

    // moduleData is needed to redirect back to the Course Composer on
    // success — wait for it to resolve before allowing submission,
    // otherwise a fast submit races ahead of it and silently falls back to
    // the old standalone-module-page redirect.
    const isLoading = lessonsLoading || moduleLoading;

    const handleSubmit = async (values) => {
        try {
            await createLessonMutation.mutateAsync({
                ...values,
                moduleId,
            });

            // Return to the Course Composer (the primary screen instructors
            // manage the Course -> Module -> Lesson -> Topic -> Content tree
            // from), same as module creation already does, instead of the
            // standalone module page.
            router.push(
                moduleData?.courseId
                    ? `/instructor/courses/${moduleData.courseId}`
                    : `/instructor/modules/${moduleId}`
            );
        } catch (error) {
            console.error(error);
            showToast(
                error?.response?.data?.message || "Failed to create lesson.",
                "error",
                "Create failed"
            );
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-20">
                <Loader/>
            </div>
        );
    }

    return (
        <LessonForm
            mode="create"
            loading={createLessonMutation.isPending}
            onSubmit={handleSubmit}
        />
    );
}
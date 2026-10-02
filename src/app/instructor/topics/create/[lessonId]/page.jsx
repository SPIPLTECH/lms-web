"use client";

import {useParams, useRouter} from "next/navigation";

import Loader from "@/components/common/Loader";
import TopicForm from "@/components/instructor/topics/TopicForm";
import {useToast} from "@/components/ui/ToastProvider";

import {useTopics} from "@/hooks/queries/instructor/useTopics";
import {useLesson} from "@/hooks/queries/instructor/useLesson";
import {useModule} from "@/hooks/queries/instructor/useModule";
import {useCreateTopic} from "@/hooks/queries/instructor/useCreateTopic";

export default function CreateTopicPage() {
    const {lessonId} = useParams();
    const router = useRouter();
    const {showToast} = useToast();

    const createTopicMutation = useCreateTopic();

    const {isLoading: topicsLoading} = useTopics(lessonId);

    const {data: lesson, isLoading: lessonLoading} = useLesson(lessonId);
    const {data: moduleData, isLoading: moduleLoading} = useModule(lesson?.moduleId, {enabled: !!lesson?.moduleId});

    // moduleData is needed to redirect back to the Course Composer on
    // success — wait for the full lesson -> module chain to resolve before
    // allowing submission, otherwise a fast submit races ahead of it and
    // silently falls back to the old standalone-lesson-page redirect.
    const isLoading = topicsLoading || lessonLoading || (!!lesson?.moduleId && moduleLoading);

    const handleSubmit = async (values) => {
        try {
            await createTopicMutation.mutateAsync({
                ...values,
                lessonId,
            });

            // Return to the Course Composer (the primary screen instructors
            // manage the Course -> Module -> Lesson -> Topic -> Content tree
            // from), same as module/lesson creation, instead of the
            // standalone lesson page.
            router.push(
                moduleData?.courseId
                    ? `/instructor/courses/${moduleData.courseId}`
                    : `/instructor/lessons/${lessonId}`
            );
        } catch (error) {
            console.error(error);
            showToast(
                error?.response?.data?.message || "Failed to create topic.",
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
        <TopicForm
            mode="create"
            loading={createTopicMutation.isPending}
            onSubmit={handleSubmit}
        />
    );
}

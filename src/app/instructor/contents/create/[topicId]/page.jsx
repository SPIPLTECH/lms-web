"use client";

import {useParams, useRouter, useSearchParams} from "next/navigation";

import Loader from "@/components/common/Loader";
import ContentForm from "@/components/instructor/contents/ContentForm";

import {useContents} from "@/hooks/queries/instructor/useContents";
import {useCreateContent} from "@/hooks/queries/instructor/useCreateContent";

export default function CreateContentPage() {
    const {topicId} = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const typeParam = searchParams.get("type");

    const createContentMutation =
        useCreateContent();

    const {isLoading} = useContents(topicId);

    const handleSubmit = async (
        values
    ) => {
        try {
            await createContentMutation.mutateAsync({
                ...values,
                topicId,

                ...(values.type ===
                    "VIDEO" && {
                        duration: Number(
                            values.duration || 0
                        ),
                    }),
            });

            router.push(
                `/instructor/topics/${topicId}`
            );
        } catch (error) {
            console.error(error);
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
        <ContentForm
            mode="create"
            initialValues={typeParam ? { type: typeParam } : undefined}
            loading={
                createContentMutation.isPending
            }
            onSubmit={handleSubmit}
        />
    );
}

"use client";

import {useParams, useRouter} from "next/navigation";

import ModuleForm from "@/components/instructor/modules/ModuleForm";
import {useToast} from "@/components/ui/ToastProvider";

import {useCreateModule} from "@/hooks/queries/instructor/useCreateModule";

export default function CreateModulePage() {
    const {courseId} = useParams();
    const router = useRouter();
    const {showToast} = useToast();

    const createModuleMutation = useCreateModule();

    const handleSubmit = async (values) => {
        try {
            await createModuleMutation.mutateAsync({
                ...values,
                courseId,
            });

            router.push(`/instructor/courses/${courseId}`);
        } catch (error) {
            console.error(error);
            showToast(
                error?.response?.data?.message || "Failed to create module.",
                "error",
                "Create failed"
            );
        }
    };

    return (
        <ModuleForm
            mode="create"
            loading={createModuleMutation.isPending}
            onSubmit={handleSubmit}
        />
    );
}
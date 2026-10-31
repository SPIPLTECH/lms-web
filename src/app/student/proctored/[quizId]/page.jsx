"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";

import Loader from "@/components/common/Loader";
import ProctoredExamPage from "@/features/proctoring/components/ProctoredExamPage";

function Content() {
    const { quizId } = useParams();
    const searchParams = useSearchParams();
    return <ProctoredExamPage quizId={quizId} returnTo={searchParams.get("from")} />;
}

export default function ProctoredExamRoute() {
    return (
        <Suspense fallback={<Loader />}>
            <Content />
        </Suspense>
    );
}

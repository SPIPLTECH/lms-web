"use client";

import { useParams } from "next/navigation";

import ReviewDetail from "@/features/proctoring/components/ReviewDetail";

export default function ProctoringReviewPage() {
    const { attemptId } = useParams();
    return <ReviewDetail attemptId={attemptId} listPath="/instructor/proctoring" />;
}

"use client";

import Loader from "@/components/common/Loader";
import ReviewDetail from "@/features/proctoring/components/ReviewDetail";
import useReviewAttemptId from "@/features/proctoring/hooks/useReviewAttemptId";

const LIST_PATH = "/instructor/proctoring";

export default function ProctoringReviewPage() {
    const attemptId = useReviewAttemptId(LIST_PATH);
    if (!attemptId) return <Loader />;
    return <ReviewDetail attemptId={attemptId} listPath={LIST_PATH} />;
}

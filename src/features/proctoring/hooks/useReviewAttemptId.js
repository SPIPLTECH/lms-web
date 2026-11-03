"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { resolveReviewTarget } from "@/lib/proctoring/reviewAddress";

/** The attempt a review page's address stands for. Null until the tab has been asked. */
export default function useReviewAttemptId(listPath) {
    const { review } = useParams();
    const router = useRouter();
    const [attemptId, setAttemptId] = useState(null);

    useEffect(() => {
        const found = resolveReviewTarget({ segment: review, listPath, storage: window.sessionStorage });
        if (found.fallback) {
            router.replace(found.fallback);
            return;
        }
        if (found.address && window.location.pathname !== found.address) {
            window.history.replaceState(window.history.state, "", found.address);
        }
        setAttemptId(found.attemptId);
    }, [review, listPath, router]);

    return attemptId;
}

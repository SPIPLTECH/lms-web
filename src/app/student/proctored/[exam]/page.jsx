"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

import Loader from "@/components/common/Loader";
import ProctoredExamPage from "@/features/proctoring/components/ProctoredExamPage";
import { resolveExamTarget } from "@/lib/proctoring/examAddress";

function Content() {
    const { exam } = useParams();
    const searchParams = useSearchParams();
    const from = searchParams.get("from");
    const [target, setTarget] = useState(null);

    // Which exam this is lives in the tab, so it is read here rather than while rendering on the server.
    useEffect(() => {
        const found = resolveExamTarget({ segment: exam, from, storage: window.sessionStorage });
        if (found.fallback) {
            window.location.replace(found.fallback);
            return;
        }
        if (found.address && window.location.pathname + window.location.search !== found.address) {
            window.history.replaceState(window.history.state, "", found.address);
        }
        setTarget((current) => (current?.quizId === found.quizId ? current : found));
    }, [exam, from]);

    if (!target) return <Loader />;
    return <ProctoredExamPage quizId={target.quizId} returnTo={target.returnTo} />;
}

export default function ProctoredExamRoute() {
    return (
        <Suspense fallback={<Loader />}>
            <Content />
        </Suspense>
    );
}

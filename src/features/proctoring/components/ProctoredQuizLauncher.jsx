"use client";

import { Camera, Clock, ListChecks, MonitorSmartphone, ShieldCheck } from "lucide-react";

import Loader from "@/components/common/Loader";
import Button from "@/components/ui/Button";
import { useProctoredQuizStatus } from "@/hooks/queries/student/useProctoredExam";
import { refusalMessage } from "@/lib/proctoring/examLogic";

function Fact({ icon: Icon, children }) {
    return (
        <li className="flex items-start gap-2 text-sm text-muted-foreground">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span>{children}</span>
        </li>
    );
}

/**
 * What a student sees wherever a proctored quiz would otherwise open. The exam has its own page,
 * entered with a full page load, because only that page may use the camera and microphone and the
 * browser keeps the permissions of the page it first loaded.
 */
export default function ProctoredQuizLauncher({ quiz, onBack, resultReturnTo }) {
    const { data: status, isLoading, isError } = useProctoredQuizStatus(quiz.id);

    const open = () => {
        const query = resultReturnTo ? `?from=${encodeURIComponent(resultReturnTo)}` : "";
        // A full page load on purpose: only this page gets camera permission, and the browser
        // keeps the policy of the page it first loaded, so client-side navigation would not get it.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign(`/student/proctored/${quiz.id}${query}`);
    };

    if (isLoading) return <Loader />;

    const inProgress = Boolean(status?.attempt);
    const refusal = status && !inProgress && !status.canStart ? refusalMessage(status.reason) : null;
    const canOpen = inProgress || status?.canStart || Boolean(status?.lastAttempt);

    return (
        <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-6 sm:p-8">
            <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ShieldCheck className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold text-foreground">{quiz.title}</h2>
                    <p className="text-xs font-medium text-muted-foreground">Proctored exam</p>
                </div>
            </div>

            <ul className="mt-4 space-y-2">
                {status?.durationMinutes ? <Fact icon={Clock}>{status.durationMinutes} minutes, starting when you begin. Your time keeps running if you leave.</Fact> : null}
                {status?.questionCount ? <Fact icon={ListChecks}>{status.questionCount} {status.questionCount === 1 ? "question" : "questions"}{status.maxAttempts ? ` · ${status.attemptsRemaining} of ${status.maxAttempts} attempts left` : ""}</Fact> : null}
                <Fact icon={Camera}>Your camera stays on throughout. You will take an identity photo first.</Fact>
                <Fact icon={MonitorSmartphone}>Use a laptop or desktop computer with a current version of Chrome or Edge.</Fact>
            </ul>

            {isError && (
                <p role="alert" className="mt-4 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
                    This exam could not be loaded. Please try again.
                </p>
            )}
            {status && !status.deviceAllowed && (
                <p role="alert" className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                    This device or browser cannot be used for this exam. Open it on a laptop or desktop computer with a current version of Chrome or Edge.
                </p>
            )}
            {refusal && (
                <p role="alert" className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                    {refusal}
                </p>
            )}

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                {canOpen && (
                    <Button type="button" onClick={open} className="flex-1">
                        {inProgress ? "Return to your exam" : status?.canStart ? "Open exam" : "View outcome"}
                    </Button>
                )}
                {onBack && (
                    <Button type="button" variant="outline" onClick={onBack} className="flex-1">
                        Go back
                    </Button>
                )}
            </div>
        </div>
    );
}

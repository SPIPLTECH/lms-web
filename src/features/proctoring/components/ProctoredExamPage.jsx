"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MonitorX, ShieldAlert } from "lucide-react";

import Loader from "@/components/common/Loader";
import Button from "@/components/ui/Button";
import ExamEndedView from "@/features/proctoring/components/ExamEndedView";
import ExamRoom from "@/features/proctoring/components/ExamRoom";
import ReadinessCheck from "@/features/proctoring/components/ReadinessCheck";
import useBrowserMonitoring from "@/features/proctoring/hooks/useBrowserMonitoring";
import useVoiceActivity from "@/features/proctoring/hooks/useVoiceActivity";
import useWebcamCapture from "@/features/proctoring/hooks/useWebcamCapture";
import { useCreateProctoredAttempt, useProctoredQuizStatus, useResumeProctoredAttempt, useStartProctoredAttempt } from "@/hooks/queries/student/useProctoredExam";
import { releaseExamLock } from "@/lib/proctoring/examLock";
import { classifyExamError, refusalMessage } from "@/lib/proctoring/examLogic";

/** A full page load, so the next page gets its own, stricter camera permissions. */
const leaveTo = (path) => window.location.assign(path);

function Notice({ icon: Icon = ShieldAlert, title, children, actions }) {
    return (
        <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
            <Icon className="h-8 w-8 text-amber-500" aria-hidden />
            <h1 className="text-lg font-semibold text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground">{children}</p>
            <div className="flex w-full flex-col gap-2">{actions}</div>
        </main>
    );
}

/** The session's camera and monitoring, kept here so they carry across the screens below. */
function ExamSession({ status, session, setSession, create, onLeave, onEnded, onViewLast }) {
    const start = useStartProctoredAttempt();
    const resume = useResumeProctoredAttempt();
    const [superseded, setSuperseded] = useState(false);
    const [intervalSeconds, setIntervalSeconds] = useState(session?.captureIntervalSeconds ?? 5);

    const token = session?.monitoringToken;
    const inProgress = session?.status === "IN_PROGRESS";
    const recheck = inProgress && session?.identityRecheckRequired;
    const running = inProgress && !recheck && !superseded;

    const markSuperseded = useCallback(() => setSuperseded(true), []);
    const markRecheck = useCallback(() => setSession((current) => ({ ...current, identityRecheckRequired: true })), [setSession]);

    const monitoring = useBrowserMonitoring({ token, active: running, onEnded, onSuperseded: markSuperseded, onIntervalChange: setIntervalSeconds });

    const monitoringRef = useRef(monitoring);
    monitoringRef.current = monitoring;

    const runningRef = useRef(running);
    runningRef.current = running;

    const camera = useWebcamCapture({
        token,
        capturing: running,
        intervalSeconds,
        onResult: (result) => monitoringRef.current.applyServerNotice(result?.proctoring),
        onEnded,
        onSuperseded: markSuperseded,
        onRecheckRequired: markRecheck,
        onCameraLost: (reason) => {
            if (runningRef.current) monitoringRef.current.reportEvent("CAMERA_INTERRUPTED", { reason });
        },
    });

    const voice = useVoiceActivity({
        enabled: running,
        onVoiceActivity: (report) => monitoringRef.current.reportEvent("VOICE_ACTIVITY_DETECTED", report),
        onUnavailable: (reason) => monitoringRef.current.reportEvent("MICROPHONE_UNAVAILABLE", { reason }),
    });

    // After a refresh the page returns straight into the exam, so the camera comes back with it.
    const { cameraStatus, requestCamera } = camera;
    const autoStarted = useRef(false);
    useEffect(() => {
        if (inProgress && cameraStatus === "IDLE" && !autoStarted.current) {
            autoStarted.current = true;
            requestCamera();
        }
    }, [inProgress, cameraStatus, requestCamera]);

    if (superseded) {
        return (
            <Notice
                icon={MonitorX}
                title="This exam is open somewhere else"
                actions={
                    <Button
                        type="button"
                        loading={resume.isPending}
                        onClick={() =>
                            resume.mutate(session.attemptId, {
                                onSuccess: (data) => {
                                    setSession(data);
                                    setSuperseded(false);
                                },
                                onError: (error) => {
                                    if (classifyExamError(error) === "ENDED") onEnded();
                                },
                            })
                        }
                    >
                        Use this window
                    </Button>
                }
            >
                An exam runs in one window at a time. Your timer keeps running, and your saved answers are safe.
            </Notice>
        );
    }

    if (recheck) {
        return <ReadinessCheck recheck status={status} session={session} camera={camera} onRecheckPassed={() => setSession((current) => ({ ...current, identityRecheckRequired: false }))} onBack={onLeave} onEnded={onEnded} />;
    }

    if (inProgress) {
        return <ExamRoom session={session} camera={camera} monitoring={monitoring} microphoneStatus={voice.status} onEnded={onEnded} onSuperseded={markSuperseded} onRecheckRequired={markRecheck} />;
    }

    return (
        <ReadinessCheck
            status={status}
            session={session}
            camera={camera}
            onCreate={async (consent) => setSession(await create.mutateAsync(consent))}
            creating={create.isPending}
            onStart={async () => setSession(await start.mutateAsync(session.attemptId))}
            starting={start.isPending}
            onBack={onLeave}
            onEnded={onEnded}
            onViewLast={onViewLast}
        />
    );
}

/**
 * /student/proctored/[quizId]. Works out where this student stands from the server, including after
 * a refresh, and shows the matching screen. The monitoring token lives only in this page's memory: a
 * refresh gets a new one, which is also what stops another tab.
 */
export default function ProctoredExamPage({ quizId, returnTo }) {
    const { data: status, isLoading, isError, error } = useProctoredQuizStatus(quizId);
    const create = useCreateProctoredAttempt(quizId);
    const resume = useResumeProctoredAttempt();
    const [session, setSession] = useState(null);
    const [endedAttemptId, setEndedAttemptId] = useState(null);
    const [viewingLast, setViewingLast] = useState(false);
    const resumed = useRef(false);
    const sessionRef = useRef(session);
    sessionRef.current = session;

    const openAttemptId = status?.attempt?.attemptId;
    const lastAttemptId = status?.lastAttempt?.id;

    useEffect(() => {
        if (!openAttemptId || session || resumed.current) return;
        resumed.current = true;
        resume.mutate(openAttemptId, {
            onSuccess: setSession,
            onError: (failure) => {
                if (classifyExamError(failure) === "ENDED") setEndedAttemptId(openAttemptId);
            },
        });
    }, [openAttemptId, session, resume]);

    const leave = useCallback(
        (result) => {
            const safeReturn = returnTo && returnTo.startsWith("/student/") ? returnTo : null;
            const courseId = result?.courseId ?? status?.courseId;
            leaveTo(safeReturn ?? (courseId ? `/student/learn/${courseId}` : "/student/quizzes"));
        },
        [returnTo, status?.courseId]
    );

    const handleEnded = useCallback(() => {
        releaseExamLock();
        setEndedAttemptId(sessionRef.current?.attemptId ?? openAttemptId ?? null);
        setSession(null);
    }, [openAttemptId]);

    if (endedAttemptId) return <ExamEndedView attemptId={endedAttemptId} onLeave={leave} />;
    if (viewingLast && lastAttemptId) return <ExamEndedView attemptId={lastAttemptId} onLeave={() => setViewingLast(false)} leaveLabel="Back" />;

    if (isLoading || (openAttemptId && !session && !resume.isError)) {
        return (
            <div className="flex min-h-dvh items-center justify-center">
                <Loader />
            </div>
        );
    }

    if (isError || resume.isError) {
        const problem = error ?? resume.error;
        const message = problem?.response?.data?.message;
        return (
            <Notice title="This exam could not be opened" actions={<><Button type="button" onClick={() => window.location.reload()}>Try again</Button><Button type="button" variant="outline" onClick={() => leave(null)}>Go back</Button></>}>
                {message || "Please check your connection and try again."}
            </Notice>
        );
    }

    if (!session) {
        if (!status.deviceAllowed) {
            return (
                <Notice icon={MonitorX} title="Use a laptop or desktop computer" actions={<Button type="button" variant="outline" onClick={() => leave(null)}>Go back</Button>}>
                    This exam needs a laptop or desktop computer with a current version of Chrome or Edge. Nothing has been used. If you cannot use one, contact your instructor.
                </Notice>
            );
        }
        if (!status.canStart) {
            if (lastAttemptId && status.reason !== "PROCTORING_UNAVAILABLE") return <ExamEndedView attemptId={lastAttemptId} onLeave={leave} />;
            return (
                <Notice title="This exam cannot begin" actions={<Button type="button" variant="outline" onClick={() => leave(null)}>Go back</Button>}>
                    {refusalMessage(status.reason) ?? "This exam is not available right now."}
                </Notice>
            );
        }
    }

    return <ExamSession status={status} session={session} setSession={setSession} create={create} onLeave={() => leave(null)} onEnded={handleEnded} onViewLast={lastAttemptId ? () => setViewingLast(true) : null} />;
}

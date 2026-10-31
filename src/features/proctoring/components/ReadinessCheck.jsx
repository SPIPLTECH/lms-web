"use client";

import { useState } from "react";
import { Camera, CheckCircle2, Circle, Mic, MicOff, ShieldCheck } from "lucide-react";

import Button from "@/components/ui/Button";
import { enterExamLock, releaseExamLock } from "@/lib/proctoring/examLock";
import { checkMicrophoneAccess } from "@/lib/proctoring/voiceActivity";
import { sendExamHeartbeat } from "@/services/proctoring.service";

const apiMessage = (error, fallback) => error?.response?.data?.message || fallback;

function Step({ done, label }) {
    const Icon = done ? CheckCircle2 : Circle;
    return (
        <li className={`flex items-center gap-2 text-xs font-medium ${done ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}`}>
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {label}
        </li>
    );
}

/**
 * Before the exam: consent, camera and microphone, identity photo, start. All of it fits one laptop
 * screen. The server checks each step again, so this page only guides. A refused microphone does
 * not stop the student, and a failed face check does. Also used for the identity check on another device.
 */
export default function ReadinessCheck({ status, session, camera, recheck = false, onCreate, creating, onStart, starting, onRecheckPassed, onBack, onEnded }) {
    const [agreed, setAgreed] = useState(false);
    const [microphone, setMicrophone] = useState("UNKNOWN");
    const [photoPassed, setPhotoPassed] = useState(session?.identityCheck === "FACE_CHECK_PASSED");
    const [photoBusy, setPhotoBusy] = useState(false);
    const [message, setMessage] = useState(null);

    const consented = Boolean(session);
    const cameraReady = camera.cameraStatus === "READY";
    const microphoneChecked = recheck || microphone !== "UNKNOWN";
    const ready = consented && cameraReady && microphoneChecked && photoPassed;

    const handleAgree = async () => {
        setMessage(null);
        try {
            await onCreate({ accepted: true, wordingVersion: status.consent.wordingVersion });
        } catch (error) {
            setMessage(apiMessage(error, "The exam could not be opened. Please try again."));
        }
    };

    const handleEnableDevices = async () => {
        setMessage(null);
        const cameraOk = await camera.requestCamera();
        if (!cameraOk || recheck) return;
        setMicrophone("REQUESTING");
        const result = await checkMicrophoneAccess();
        setMicrophone(result);
        // A background note, and it never holds anyone up.
        sendExamHeartbeat(session.monitoringToken, { microphoneStatus: result === "READY" ? "GRANTED" : "REFUSED" }).catch(() => {});
    };

    const handleTakePhoto = async () => {
        setMessage(null);
        setPhotoBusy(true);
        try {
            const result = await camera.capture(recheck ? "IDENTITY_RECHECK" : "PRE_EXAM_IDENTITY", { foreground: true });
            if (!result) return;
            if (recheck) {
                if (result.identityRecheckRequired) setMessage(result.message);
                else onRecheckPassed();
                return;
            }
            setPhotoPassed(result.identityCheck === "FACE_CHECK_PASSED");
            setMessage(result.message ?? null);
        } catch (error) {
            setMessage(error?.response ? apiMessage(error, "Your photo could not be checked. Please try again.") : error?.message || "Your photo could not be checked. Please try again.");
        } finally {
            setPhotoBusy(false);
        }
    };

    const handleStart = async () => {
        setMessage(null);
        // Fullscreen has to begin in this click, before anything is awaited.
        const lock = enterExamLock();
        try {
            await onStart();
            await lock;
        } catch (error) {
            await lock;
            releaseExamLock();
            const code = error?.response?.data?.code;
            if (code === "ATTEMPT_ENDED" || code === "TIME_EXPIRED") {
                onEnded?.();
                return;
            }
            setMessage(apiMessage(error, "The exam could not be started. Please try again."));
        }
    };

    return (
        <main className="mx-auto flex min-h-dvh max-w-5xl flex-col justify-center gap-3 p-3 sm:p-4">
            <header className="flex items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ShieldCheck className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0">
                    <h1 className="truncate text-base font-bold text-foreground">{recheck ? "Confirm it is you" : status?.title}</h1>
                    <p className="text-xs text-muted-foreground">
                        {recheck
                            ? "You opened this exam on another device, so we need a new photo. Your timer keeps running."
                            : `${status?.durationMinutes} minutes · ${status?.questionCount} ${status?.questionCount === 1 ? "question" : "questions"}. The clock starts when you press Start exam.`}
                    </p>
                </div>
            </header>

            {(message || camera.errorMessage) && (
                <p role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-800 dark:text-amber-300">
                    {message || camera.errorMessage}
                </p>
            )}

            <div className={`grid gap-3 ${recheck ? "mx-auto w-full max-w-md" : "md:grid-cols-2"}`}>
                {!recheck && (
                    <section aria-labelledby="consent-title" className="flex min-h-0 flex-col gap-2 rounded-2xl border border-border bg-card p-4">
                        <h2 id="consent-title" className="text-sm font-semibold text-foreground">Exam monitoring notice</h2>
                        <div tabIndex={0} className="max-h-[38dvh] overflow-y-auto whitespace-pre-line rounded-lg border border-border bg-background/60 p-3 text-xs leading-relaxed text-muted-foreground">
                            {status?.consent?.text}
                        </div>
                        {consented ? (
                            <p className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                                <CheckCircle2 className="h-4 w-4" aria-hidden /> You have agreed to this notice.
                            </p>
                        ) : (
                            <>
                                <label className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
                                    <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} className="mt-0.5 h-4 w-4" />
                                    <span>I have read this notice and agree to be monitored during this exam.</span>
                                </label>
                                <p className="text-xs text-muted-foreground">If you cannot use a webcam or do not agree, do not continue. Contact your instructor. No attempt is used.</p>
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <Button type="button" onClick={handleAgree} disabled={!agreed || creating} loading={creating} className="flex-1">
                                        Agree and continue
                                    </Button>
                                    <Button type="button" variant="outline" onClick={onBack} className="flex-1">
                                        Go back
                                    </Button>
                                </div>
                            </>
                        )}
                        <ul className="mt-auto grid grid-cols-2 gap-1 border-t border-border pt-2">
                            <Step done={consented} label="Notice agreed" />
                            <Step done={cameraReady} label="Camera on" />
                            <Step done={microphoneChecked} label="Microphone checked" />
                            <Step done={photoPassed} label="Photo checked" />
                        </ul>
                    </section>
                )}

                <section aria-label="Camera" className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
                    <div className="relative aspect-[4/3] max-h-[42dvh] w-full overflow-hidden rounded-xl border border-border bg-black">
                        <video ref={camera.attachVideo} muted playsInline autoPlay aria-label="Your camera" className="h-full w-full object-cover" />
                        {!cameraReady && (
                            <div className="absolute inset-0 flex items-center justify-center text-xs text-white/70">
                                <Camera className="mr-2 h-4 w-4" aria-hidden /> Camera off
                            </div>
                        )}
                    </div>

                    {!recheck && microphone !== "UNKNOWN" && microphone !== "REQUESTING" && (
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            {microphone === "READY" ? <Mic className="h-3.5 w-3.5" aria-hidden /> : <MicOff className="h-3.5 w-3.5" aria-hidden />}
                            {microphone === "READY" ? "Microphone ready." : "Microphone not available. You can continue, and your instructor will see this."}
                        </p>
                    )}

                    <div className="mt-auto flex flex-col gap-2">
                        {!cameraReady && (
                            <Button type="button" onClick={handleEnableDevices} disabled={!consented || camera.cameraStatus === "REQUESTING"} loading={camera.cameraStatus === "REQUESTING"}>
                                {recheck ? "Turn on camera" : "Turn on camera and microphone"}
                            </Button>
                        )}
                        {cameraReady && (
                            <Button type="button" variant={photoPassed ? "outline" : "primary"} onClick={handleTakePhoto} disabled={photoBusy || !microphoneChecked} loading={photoBusy}>
                                {photoPassed ? "Retake photo" : "Take identity photo"}
                            </Button>
                        )}
                        {!recheck && (
                            <Button type="button" variant="success" onClick={handleStart} disabled={!ready || starting} loading={starting}>
                                Start exam
                            </Button>
                        )}
                    </div>
                </section>
            </div>
        </main>
    );
}

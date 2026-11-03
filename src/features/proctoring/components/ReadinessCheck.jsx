"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Camera, Check, CheckCircle2, FileText, Lock, Maximize, Mic, MicOff, MonitorX, ScanFace, ShieldCheck } from "lucide-react";

import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { enterExamLock, releaseExamLock } from "@/lib/proctoring/examLock";
import { SCREEN_CAPTURE_MESSAGE, startReadinessProblem } from "@/lib/proctoring/examLogic";
import { captureGuard } from "@/lib/proctoring/screenCapture";
import { checkMicrophoneAccess } from "@/lib/proctoring/voiceActivity";
import { sendExamHeartbeat } from "@/services/proctoring.service";

const apiMessage = (error, fallback) => error?.response?.data?.message || fallback;

const noCapture = () => 0;

// As the page loads, so anything this page starts from here on is seen.
if (typeof window !== "undefined") captureGuard.install();

const EXAM_STEPS = [
    { id: "notice", label: "Notice" },
    { id: "devices", label: "Camera & mic" },
    { id: "photo", label: "Identity photo" },
    { id: "final", label: "Final check" },
];
const RECHECK_STEPS = [
    { id: "devices", label: "Camera" },
    { id: "photo", label: "Identity photo" },
];
/** The steps that show the camera. The video stays mounted on the others, so the stream stays live. */
const CAMERA_STEPS = new Set(["devices", "photo"]);

function StepBar({ steps, current }) {
    return (
        <ol className="grid shrink-0" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
            {steps.map((step, index) => {
                const done = index < current;
                const on = index === current;
                return (
                    <li key={step.id} aria-current={on ? "step" : undefined} className={`relative flex flex-col items-center gap-1 text-xs font-semibold ${on ? "text-foreground" : "text-muted-foreground"}`}>
                        {index > 0 && <span aria-hidden className={`absolute right-1/2 top-[13px] h-0.5 w-full transition-colors ${index <= current ? "bg-emerald-500" : "bg-border"}`} />}
                        <span
                            className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition ${
                                done ? "border-emerald-500 bg-card text-emerald-600 dark:text-emerald-400" : on ? "border-primary bg-primary text-primary-foreground ring-4 ring-primary/20" : "border-border bg-card"
                            }`}
                        >
                            {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden /> : index + 1}
                        </span>
                        {step.label}
                    </li>
                );
            })}
        </ol>
    );
}

function Fact({ icon: Icon, title, children }) {
    return (
        <div className="flex gap-3 rounded-xl border border-border bg-background/60 p-3 transition hover:-translate-y-0.5 hover:border-primary/40">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{children}</p>
            </div>
        </div>
    );
}

function DeviceRow({ icon: Icon, done, title, children, aside = null }) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-background/60 px-3 py-2.5">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${done ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                {done ? <Check className="h-4 w-4" strokeWidth={3} aria-hidden /> : <Icon className="h-4 w-4" aria-hidden />}
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground">{children}</p>
            </div>
            {aside}
        </div>
    );
}

function Rule({ icon: Icon, title, children, tone = "text-amber-500" }) {
    return (
        <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-background/60 p-3">
            <Icon className={`h-5 w-5 ${tone}`} aria-hidden />
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">{children}</p>
        </div>
    );
}

/**
 * Before the exam: one step at a time, consent, camera and microphone, identity photo, then a last
 * check and Start. It fits one laptop screen without scrolling. The server checks each step again,
 * so this page only guides. A refused microphone does not stop the student, and a failed face check
 * does. Also used, with only the camera and photo steps, for the identity check on another device.
 */
export default function ReadinessCheck({ status, session, camera, recheck = false, onCreate, creating, onStart, starting, onRecheckPassed, onBack, onEnded, onViewLast }) {
    const [agreed, setAgreed] = useState(false);
    const [microphone, setMicrophone] = useState("UNKNOWN");
    const [photoPassed, setPhotoPassed] = useState(session?.identityCheck === "FACE_CHECK_PASSED");
    const [photoBusy, setPhotoBusy] = useState(false);
    const [message, setMessage] = useState(null);
    const [recordingClosed, setRecordingClosed] = useState(false);
    const [noticeOpen, setNoticeOpen] = useState(false);
    const startingRef = useRef(false);
    const captureSessions = useSyncExternalStore(captureGuard.subscribe, captureGuard.activeSessions, noCapture);
    const captureRunning = captureSessions > 0;

    const consented = Boolean(session);
    const cameraReady = camera.cameraStatus === "READY";
    const microphoneChecked = recheck || (microphone !== "UNKNOWN" && microphone !== "REQUESTING");
    const ready = consented && cameraReady && microphoneChecked && photoPassed && recordingClosed && !captureRunning;

    const steps = recheck ? RECHECK_STEPS : EXAM_STEPS;
    const stepDone = { notice: consented, devices: cameraReady && microphoneChecked, photo: photoPassed, final: ready };
    // A student coming back (after agreeing, say) starts at the first step not yet done.
    const [stepIndex, setStepIndex] = useState(() => {
        const first = steps.findIndex((step) => !stepDone[step.id]);
        return first === -1 ? steps.length - 1 : first;
    });
    const step = steps[stepIndex].id;
    const showCamera = CAMERA_STEPS.has(step);
    const goBack = () => {
        setMessage(null);
        setStepIndex((index) => Math.max(0, index - 1));
    };
    const goNext = () => {
        setMessage(null);
        setStepIndex((index) => Math.min(steps.length - 1, index + 1));
    };

    // Stopping the capture clears what was said about it.
    useEffect(() => {
        if (!captureRunning) setMessage((current) => (current === SCREEN_CAPTURE_MESSAGE ? null : current));
    }, [captureRunning]);

    const handleAgree = async () => {
        setMessage(null);
        try {
            await onCreate({ accepted: true, wordingVersion: status.consent.wordingVersion });
            goNext();
        } catch (error) {
            setMessage(apiMessage(error, "The exam could not be opened. Please try again."));
        }
    };

    /** Turns the camera on if it is off, then checks the microphone once. */
    const handleEnableDevices = async () => {
        setMessage(null);
        if (!cameraReady) {
            const cameraOk = await camera.requestCamera();
            if (!cameraOk) return;
        }
        if (recheck) return;
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
        if (startingRef.current) return;
        // Everything may have changed since the button lit up, and these checks are immediate, so
        // fullscreen can still begin in this click. The server then checks its own part again.
        const problem = startReadinessProblem({ cameraLive: camera.isLive(), captureSessions: captureGuard.activeSessions(), recordingClosedConfirmed: recordingClosed });
        if (problem) {
            setMessage(problem);
            return;
        }
        setMessage(null);
        startingRef.current = true;
        // Closes the gap between this check and the exam's own guard taking over.
        const allowCaptures = captureGuard.refuseNew();
        const lock = enterExamLock();
        try {
            await onStart({ screenCaptureSessions: captureGuard.activeSessions(), recordingClosedConfirmed: true });
            await lock;
        } catch (error) {
            await lock;
            releaseExamLock();
            allowCaptures();
            startingRef.current = false;
            const code = error?.response?.data?.code;
            if (code === "ATTEMPT_ENDED" || code === "TIME_EXPIRED") {
                onEnded?.();
                return;
            }
            setMessage(apiMessage(error, "The exam could not be started. Please try again."));
        }
    };

    const maxWarnings = session?.maxWarnings ?? 3;
    const backButton = stepIndex > 0 ? (
        <Button type="button" variant="ghost" onClick={goBack} className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back
        </Button>
    ) : (
        <Button type="button" variant="ghost" onClick={onBack}>
            Go back
        </Button>
    );
    const continueButton = (
        <Button type="button" onClick={goNext} disabled={!stepDone[step]} className="inline-flex items-center gap-2 px-6">
            Continue <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
    );

    let title;
    let subtitle;
    let body;
    let footer;
    if (step === "notice") {
        title = "Before you start";
        subtitle = "This exam is proctored. Here is what that means for you.";
        body = (
            <>
                <div className="grid gap-3 sm:grid-cols-2">
                    <Fact icon={Camera} title="Photos every few seconds">Checked automatically for a phone or another person in view.</Fact>
                    <Fact icon={Mic} title="Microphone hears speech only">It measures whether someone is speaking. No sound is recorded.</Fact>
                    <Fact icon={Maximize} title="Stay in fullscreen">Leaving fullscreen or switching windows is noted.</Fact>
                    {status?.identityMatching ? (
                        <Fact icon={ScanFace} title="Your face is matched">An identity photo is compared with you during the exam.</Fact>
                    ) : (
                        <Fact icon={ScanFace} title="Identity photo">Before you start, we check that one face is visible.</Fact>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                    <button type="button" onClick={() => setNoticeOpen(true)} className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-primary underline-offset-2 hover:underline">
                        <FileText className="h-4 w-4" aria-hidden /> Read the full notice
                    </button>
                </div>
                {consented ? (
                    <p className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" aria-hidden /> You have agreed to this notice.
                    </p>
                ) : (
                    <label className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 text-sm text-foreground transition ${agreed ? "border-emerald-500/40 bg-emerald-500/10" : "border-border"}`}>
                        <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} className="mt-0.5 h-4 w-4 accent-emerald-600" />
                        <span>I have read this notice and agree to be monitored during this exam.</span>
                    </label>
                )}
            </>
        );
        footer = consented ? (
            <>
                {backButton}
                {continueButton}
            </>
        ) : (
            <>
                <p className="hidden max-w-sm text-xs text-muted-foreground sm:block">Can&apos;t use a webcam or don&apos;t agree? Go back and contact your instructor. No attempt is used.</p>
                <div className="flex gap-2">
                    {backButton}
                    <Button type="button" onClick={handleAgree} disabled={!agreed || creating} loading={creating} className="inline-flex items-center gap-2 px-6">
                        Agree and continue <ArrowRight className="h-4 w-4" aria-hidden />
                    </Button>
                </div>
            </>
        );
    } else if (step === "devices") {
        const requesting = camera.cameraStatus === "REQUESTING" || microphone === "REQUESTING";
        title = recheck ? "Confirm it is you" : "Turn on your camera and microphone";
        subtitle = recheck ? "You opened this exam on another device, so we need a new photo. Your timer keeps running." : "Your browser will ask for permission. Choose Allow.";
        body = (
            <div className="flex flex-col gap-2.5">
                <DeviceRow icon={Camera} done={cameraReady} title="Camera">
                    {cameraReady ? "Working. You can see yourself." : "Not on yet."}
                </DeviceRow>
                {!recheck && (
                    <DeviceRow icon={microphone === "READY" || microphone === "UNKNOWN" || microphone === "REQUESTING" ? Mic : MicOff} done={microphoneChecked} title="Microphone">
                        {microphone === "READY" ? "Ready." : microphone === "UNKNOWN" || microphone === "REQUESTING" ? "Not checked yet." : "Not available. You can continue, and your instructor will see this."}
                    </DeviceRow>
                )}
                {!stepDone.devices && (
                    <Button type="button" onClick={handleEnableDevices} disabled={!consented || requesting} loading={requesting} className="mt-1 inline-flex items-center justify-center gap-2">
                        <Camera className="h-4 w-4" aria-hidden />
                        {recheck ? "Turn on camera" : cameraReady ? "Check microphone" : "Turn on camera and microphone"}
                    </Button>
                )}
            </div>
        );
        footer = (
            <>
                {backButton}
                {continueButton}
            </>
        );
    } else if (step === "photo") {
        title = recheck ? "Take a new identity photo" : "Take your identity photo";
        subtitle = "Fit your face inside the outline, look at the camera, and make sure your face is well lit.";
        body = (
            <div className="flex flex-col gap-3">
                {photoPassed && !recheck ? (
                    <p className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="h-5 w-5" aria-hidden /> Face check passed
                    </p>
                ) : (
                    <ul className="flex flex-col gap-2 text-sm text-foreground">
                        {["Fit your face inside the outline", "Face a light, not a window", "Remove hats and sunglasses", "Only you in view"].map((tip) => (
                            <li key={tip} className="flex items-center gap-2">
                                <Check className="h-4 w-4 shrink-0 text-emerald-500" strokeWidth={3} aria-hidden /> {tip}
                            </li>
                        ))}
                    </ul>
                )}
                {cameraReady ? (
                    <Button type="button" variant={photoPassed && !recheck ? "outline" : "primary"} onClick={handleTakePhoto} disabled={photoBusy || !microphoneChecked} loading={photoBusy} className="inline-flex items-center justify-center gap-2">
                        <Camera className="h-4 w-4" aria-hidden />
                        {photoPassed && !recheck ? "Retake photo" : "Take photo"}
                    </Button>
                ) : (
                    <Button type="button" onClick={handleEnableDevices} disabled={camera.cameraStatus === "REQUESTING"} loading={camera.cameraStatus === "REQUESTING"} className="inline-flex items-center justify-center gap-2">
                        <Camera className="h-4 w-4" aria-hidden /> Turn camera back on
                    </Button>
                )}
            </div>
        );
        footer = (
            <>
                {backButton}
                {!recheck && continueButton}
            </>
        );
    } else {
        title = "Last check, then start";
        subtitle = "Close anything that records or shares your screen.";
        body = (
            <>
                {captureRunning && (
                    <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-700 dark:text-rose-300">
                        <MonitorX className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                        <span>{SCREEN_CAPTURE_MESSAGE} No attempt has been used.</span>
                    </p>
                )}
                <button
                    type="button"
                    role="switch"
                    aria-checked={recordingClosed}
                    onClick={() => setRecordingClosed((value) => !value)}
                    className={`flex items-center gap-3.5 rounded-xl border px-4 py-3.5 text-left transition ${recordingClosed ? "border-emerald-500/40 bg-emerald-500/10" : "border-border hover:border-primary/40"}`}
                >
                    <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${recordingClosed ? "bg-emerald-600" : "bg-muted"}`}>
                        <span className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow transition-all ${recordingClosed ? "left-[23px]" : "left-[3px]"}`} />
                    </span>
                    <span>
                        <span className="block text-sm font-semibold text-foreground">Screen recording, sharing and remote access are closed</span>
                        <span className="block text-xs text-muted-foreground">Recording this exam is not allowed.</span>
                    </span>
                </button>
                <div className="grid gap-3 sm:grid-cols-3">
                    <Rule icon={Maximize} title="Fullscreen opens">
                        The {status?.durationMinutes}-minute clock starts when you press Start exam.
                    </Rule>
                    <Rule icon={AlertTriangle} title={`${maxWarnings} warnings end the exam`}>
                        Warnings come from things such as leaving fullscreen or a phone in view.
                    </Rule>
                    <Rule icon={Check} title="Answers save as you go" tone="text-emerald-500">
                        If your connection drops, they are sent when it returns.
                    </Rule>
                </div>
            </>
        );
        footer = (
            <>
                {backButton}
                <Button type="button" onClick={handleStart} disabled={!ready || starting} loading={starting} className="inline-flex items-center gap-2 px-6">
                    {!ready && <Lock className="h-4 w-4" aria-hidden />}
                    Start exam <ArrowRight className="h-4 w-4" aria-hidden />
                </Button>
            </>
        );
    }

    return (
        <main className="mx-auto flex h-dvh w-full max-w-4xl flex-col gap-3 overflow-y-auto p-3 sm:p-4">
            <header className="flex shrink-0 items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <ShieldCheck className="h-5 w-5" aria-hidden />
                    </div>
                    <div className="min-w-0">
                        <h1 className="truncate text-base font-bold text-foreground sm:text-lg">{status?.title}</h1>
                        <p className="text-xs text-muted-foreground">
                            {status?.durationMinutes} minutes · {status?.questionCount} {status?.questionCount === 1 ? "question" : "questions"}
                            {status?.passingScore != null ? ` · Pass mark ${status.passingScore}%` : ""}
                        </p>
                    </div>
                </div>
                {onViewLast && !recheck && (
                    <button type="button" onClick={onViewLast} className="shrink-0 text-xs font-semibold text-primary underline underline-offset-2">
                        See your last attempt
                    </button>
                )}
            </header>

            <StepBar steps={steps} current={stepIndex} />

            {(message || camera.errorMessage) && (
                <p role="alert" className="shrink-0 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-800 dark:text-amber-300">
                    {message || camera.errorMessage}
                </p>
            )}

            <section aria-labelledby="readiness-step-title" className="flex min-h-0 flex-1 flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:p-6">
                <div className="shrink-0">
                    <h2 id="readiness-step-title" className="text-lg font-bold text-foreground sm:text-xl">{title}</h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
                </div>

                <div className={`grid min-h-0 flex-1 gap-4 ${showCamera ? "md:grid-cols-[auto_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)]" : ""}`}>
                    {/* One video for every step, so the stream and the Start check stay live. */}
                    <div className={showCamera ? "relative mx-auto aspect-[4/3] h-full max-h-[48dvh] min-h-40 max-w-full overflow-hidden rounded-xl border border-border bg-black md:max-h-none" : "pointer-events-none fixed -left-[9999px] top-0 h-24 w-32 opacity-0"} aria-hidden={!showCamera}>
                        <video ref={camera.attachVideo} muted playsInline autoPlay aria-label="Your camera" className="h-full w-full object-cover" />
                        {showCamera && cameraReady && (
                            <span className="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-bold text-white">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" aria-hidden /> LIVE
                            </span>
                        )}
                        {showCamera && step === "photo" && cameraReady && (
                            <span aria-hidden className={`absolute left-1/2 top-[10%] h-[62%] w-[40%] -translate-x-1/2 rounded-[50%_50%_46%_46%] border-2 transition-colors ${photoPassed ? "border-solid border-emerald-400" : "border-dashed border-white/50"}`} />
                        )}
                        {showCamera && photoBusy && (
                            <span className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 text-sm font-semibold text-white">Checking your photo…</span>
                        )}
                        {showCamera && !cameraReady && (
                            <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-white/70">
                                <Camera className="h-6 w-6" aria-hidden />
                                {camera.cameraStatus === "REQUESTING" ? "Waiting for your browser…" : "Camera is off"}
                            </span>
                        )}
                    </div>
                    <div className="flex min-h-0 flex-col gap-3">{body}</div>
                </div>

                <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border pt-3">{footer}</div>
            </section>

            <Modal open={noticeOpen} onClose={() => setNoticeOpen(false)} title="Exam monitoring notice" size="lg">
                <div tabIndex={0} className="max-h-[60dvh] overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {status?.consent?.text}
                </div>
                <div className="mt-4 flex justify-end">
                    <Button type="button" onClick={() => setNoticeOpen(false)}>
                        Close
                    </Button>
                </div>
            </Modal>
        </main>
    );
}

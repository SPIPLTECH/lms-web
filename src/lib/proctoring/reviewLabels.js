/**
 * The words the review screens use. Kept apart so they can be tested, and so each screen says the
 * same thing. "Signal" is deliberate: none of this is proof of misconduct, and a person decides.
 */

export const FLAG_REASON_LABELS = {
    SINGLE_HIGH_CONFIDENCE_OBJECT: "A phone was seen once, with high confidence",
    PERSISTENT_IDENTITY_MISMATCH: "The face did not match the identity photo",
    PERSISTENT_ABSENCE: "The student was away from the camera",
    CORRELATED_CRITICAL_VIOLATION: "Several signals occurred together",
    WARNING_LIMIT_REACHED: "The warning limit was reached",
    AI_UNAVAILABLE: "Automatic analysis was unavailable for part of the exam",
    UPLOADS_STOPPED: "Monitoring stopped reaching the server for a while",
    CAMERA_LOST: "The camera stopped or was blocked",
    FRAMES_ARRIVING_LATE: "Photos arrived late",
    IDENTITY_RECHECK_FAILED: "An identity recheck on another device did not match",
    IDENTITY_RECHECK_UNVERIFIED: "An identity recheck on another device could not be verified",
};

export const TERMINATION_RULE_LABELS = {
    CONFIRMED_PROHIBITED_OBJECT: "A phone stayed in view",
    PERSISTENT_MULTIPLE_FACES: "A second person stayed in view",
    WARNING_LIMIT_REACHED: "Reached the maximum warning limit",
};

export const flagReasonLabel = (reason) => FLAG_REASON_LABELS[reason] ?? String(reason || "").replace(/_/g, " ").toLowerCase();

const EVENT_LABELS = {
    TAB_HIDDEN: "Left the exam tab or minimised the window",
    TAB_VISIBLE: "Returned to the exam tab",
    WINDOW_BLUR: "The exam window lost focus",
    WINDOW_FOCUS: "The exam window regained focus",
    FULLSCREEN_EXIT: "Left fullscreen",
    FULLSCREEN_ENTER: "Entered fullscreen",
    COPY_ATTEMPT: "Copy blocked",
    PASTE_ATTEMPT: "Paste blocked",
    CUT_ATTEMPT: "Cut blocked",
    CONTEXT_MENU: "Right-click menu blocked",
    SCREENSHOT_ATTEMPT: "Screenshot shortcut blocked",
    SCREEN_SHARE_ATTEMPT: "Screen share blocked",
    CAMERA_DENIED: "Camera not available",
    CAMERA_INTERRUPTED: "Camera stopped",
    DISCONNECT: "Connection dropped",
    MONITORING_GAP: "Monitoring interrupted",
    VOICE_ACTIVITY_DETECTED: "Speech noticed (no audio recorded)",
    MICROPHONE_UNAVAILABLE: "Microphone not available",
    FACE_NOT_DETECTED: "No face in view",
    MULTIPLE_FACES_DETECTED: "More than one face in view",
    HEAD_POSE_AWAY: "Looking away from the screen",
    PROHIBITED_OBJECT_DETECTED: "Phone or prohibited item seen",
    IDENTITY_MISMATCH_DETECTED: "Face did not match the identity photo",
    AI_CORRELATED_ALERT: "Several signals occurred together",
    ATTEMPT_FLAGGED: "Flagged for review",
    AUTO_TERMINATION_ENFORCED: "Exam ended by proctoring",
};

const LOCK_WORDS = { active: "Keyboard lock on", pending: "Keyboard lock not confirmed", refused: "Keyboard lock not available", unsupported: "Keyboard lock not available", off: "Keyboard lock off" };

/**
 * How a student left fullscreen, as far as the browser could tell. Under Keyboard Lock Esc reaches
 * the page, so an exit with no Esc came another way, most likely the browser's own exit button.
 */
export function fullscreenExitDetail(metadata) {
    const parts = [];
    if (typeof metadata?.escHeldMs === "number") parts.push(`Esc held for ${(metadata.escHeldMs / 1000).toFixed(1)} s`);
    else if (metadata?.keyboardLock === "active") parts.push("Not through Esc, most likely the browser's exit button");
    if (LOCK_WORDS[metadata?.keyboardLock]) parts.push(LOCK_WORDS[metadata.keyboardLock]);
    return parts.length > 0 ? parts.join(" · ") : null;
}

export const eventLabel = (eventType) => EVENT_LABELS[eventType] ?? String(eventType || "").replace(/_/g, " ").toLowerCase();

/** The one line under an event that a reviewer needs: how fullscreen was left, or how sure the AI was. */
export function eventNote(event) {
    if (event.eventType === "FULLSCREEN_EXIT") return fullscreenExitDetail(event.metadata);
    if (typeof event.metadata?.signalConfidence === "number") return `Confidence ${Math.round(event.metadata.signalConfidence * 100)}%`;
    return null;
}

/** What the review banner says about how the attempt ended. */
export function reviewOutcome(attempt) {
    if (attempt.status === "TERMINATED") {
        const rule = TERMINATION_RULE_LABELS[attempt.terminationRule];
        const count = attempt.terminationRule === "WARNING_LIMIT_REACHED" ? ` (${attempt.warningCount} / ${attempt.maxWarnings ?? 3})` : "";
        return { kind: "PROCTORING", title: "Ended by proctoring", detail: rule ? `${rule}${count}` : attempt.terminationReason || "" };
    }
    if (attempt.isFlagged) {
        const [first, ...rest] = attempt.flags ?? [];
        const detail = first ? `${flagReasonLabel(first.reason)}${rest.length > 0 ? `, and ${rest.length} more` : ""}` : "";
        return { kind: "FLAGGED", title: "Flagged for review", detail };
    }
    return { kind: "CLEAR", title: "No concerns", detail: "Nothing was flagged during this exam." };
}

const ENDING_EVENT = "AUTO_TERMINATION_ENFORCED";
/** Returning, and the server's own summaries: they explain nothing on their own. */
const QUIET_EVENTS = new Set(["FULLSCREEN_ENTER", "TAB_VISIBLE", "WINDOW_FOCUS", "ATTEMPT_FLAGGED", "AI_CORRELATED_ALERT"]);

/**
 * The review's warning cards, in the shape the Exam Ended page's cards take: each warning with its
 * number and first held photo, the ending on its own, and everything else folded away. An exam that
 * ended with no warning (a sustained phone, say) shows its last moments that have photos instead.
 */
export function reviewWarnings(events = [], evidence = [], { terminated = false } = {}) {
    const byFrame = new Map(evidence.map((row) => [row.frameId, row]));
    let warningNumber = 0;
    const toCard = (event) => {
        const photo = (event.metadata?.evidenceIds ?? []).map((id) => byFrame.get(id)).find(Boolean) ?? null;
        return {
            id: event.id,
            eventType: event.eventType,
            timestamp: event.timestamp,
            warningNumber: event.warningIssued ? (warningNumber += 1) : null,
            explanation: eventLabel(event.eventType),
            note: eventNote(event),
            evidenceId: photo?.id ?? null,
            evidenceCapturedAt: photo?.receivedAt ?? null,
        };
    };
    const cards = events.filter((event) => event.eventType !== ENDING_EVENT && !QUIET_EVENTS.has(event.eventType)).map(toCard);
    const ending = events.find((event) => event.eventType === ENDING_EVENT);
    const warnings = cards.filter((card) => card.warningNumber);
    const recordedOnly = cards.filter((card) => !card.warningNumber);
    const featured = warnings.length > 0 ? warnings : terminated ? recordedOnly.filter((card) => card.evidenceId).slice(-3) : [];
    return {
        featured,
        endingEvent: ending ? { id: ending.id, timestamp: ending.timestamp, explanation: eventLabel(ending.eventType) } : null,
        others: recordedOnly.filter((card) => !featured.includes(card)),
    };
}

export const DECISION_OPTIONS = {
    UPHOLD: { label: "Uphold", help: "The ending stands. The attempt is used, is not a pass, and the quiz counts as finished." },
    RETAKE: { label: "Allow retake", help: "This attempt stops counting as a pass, and the student gets one more attempt." },
    ACCEPT: { label: "Accept", help: "The score stands, and any pass counts." },
    VOID: { label: "Void", help: "This attempt stops counting as a pass. It stays used, with no extra attempt." },
};

export const DECISION_DONE = { UPHOLD: "Upheld", RETAKE: "Retake allowed", ACCEPT: "Accepted", VOID: "Voided" };

/** What a student reads about a decision. */
export const DECISION_FOR_STUDENT = {
    UPHOLD: "Your instructor upheld the ending of this exam.",
    RETAKE: "Your instructor has allowed you to retake this exam.",
    ACCEPT: "Your instructor accepted this attempt. Your score stands.",
    VOID: "Your instructor voided this attempt. It does not count as a pass.",
};

export const OUTCOME_LABELS = {
    ENDED_BY_PROCTORING: "Ended by proctoring",
    UNDER_REVIEW: "Under review",
    VOIDED: "Voided",
    RETAKE_ALLOWED: "Retake allowed",
};

export const needsDecisionNote = (decision) => decision !== "ACCEPT";

/** A plain summary of the AI's reading of one photo, for staff. Students never see this. */
export function analysisLine(analysis) {
    if (!analysis) return "Not analysed";
    if (analysis.status !== "OK") return `Not analysed${analysis.errorCode ? ` (${analysis.errorCode})` : ""}`;
    const parts = [];
    const faces = analysis.faceScores ?? [];
    parts.push(analysis.classification === "NO_FACE" ? "No face" : analysis.classification === "MULTIPLE_FACES" ? `${analysis.facesDetected} faces` : "One face");
    if (faces.length > 0) parts.push(`face ${Math.round(Math.max(...faces) * 100)}%`);
    for (const item of analysis.objects ?? []) parts.push(`${item.label} ${Math.round(item.score * 100)}%`);
    if (analysis.identity?.status === "MATCH" || analysis.identity?.status === "MISMATCH") {
        parts.push(`${analysis.identity.status === "MATCH" ? "matches" : "does not match"} identity photo (${analysis.identity.similarity})`);
    }
    if (analysis.headPose?.orientation === "AWAY") parts.push(`looking ${String(analysis.headPose.direction || "away").toLowerCase()}`);
    return parts.join(" · ");
}

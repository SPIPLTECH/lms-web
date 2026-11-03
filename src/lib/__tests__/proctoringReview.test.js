import { DECISION_DONE, DECISION_FOR_STUDENT, DECISION_OPTIONS, FLAG_REASON_LABELS, OUTCOME_LABELS, TERMINATION_RULE_LABELS, analysisLine, eventLabel, flagReasonLabel, fullscreenExitDetail, needsDecisionNote, reviewOutcome, reviewWarnings } from "../proctoring/reviewLabels.js";

/** The words the proctoring review screens use, and the summary of a photo's analysis. */
let failed = 0;
const check = (name, ok) => {
    console.log(`${ok ? "[PASS]" : "[FAIL]"} ${name}`);
    if (!ok) failed += 1;
};

const DECISIONS = ["UPHOLD", "RETAKE", "ACCEPT", "VOID"];
check("every decision has words for staff and the student", DECISIONS.every((d) => DECISION_OPTIONS[d]?.label && DECISION_OPTIONS[d]?.help && DECISION_DONE[d] && DECISION_FOR_STUDENT[d]));
check("only Accept can go without a reason", !needsDecisionNote("ACCEPT") && ["UPHOLD", "RETAKE", "VOID"].every(needsDecisionNote));

// The server's flag reasons, written out so a new one without words fails here.
const SERVER_FLAGS = ["SINGLE_HIGH_CONFIDENCE_OBJECT", "PERSISTENT_IDENTITY_MISMATCH", "PERSISTENT_ABSENCE", "CORRELATED_CRITICAL_VIOLATION", "WARNING_LIMIT_REACHED", "AI_UNAVAILABLE", "UPLOADS_STOPPED", "CAMERA_LOST", "FRAMES_ARRIVING_LATE", "IDENTITY_RECHECK_FAILED", "IDENTITY_RECHECK_UNVERIFIED"];
check("every flag the server raises has plain words", SERVER_FLAGS.every((reason) => Boolean(FLAG_REASON_LABELS[reason])));
check("an unknown flag still reads as words", flagReasonLabel("SOME_NEW_REASON") === "some new reason");
check("the three rules that can end an exam have words", Boolean(TERMINATION_RULE_LABELS.CONFIRMED_PROHIBITED_OBJECT && TERMINATION_RULE_LABELS.PERSISTENT_MULTIPLE_FACES && TERMINATION_RULE_LABELS.WARNING_LIMIT_REACHED));
check("only outcomes that need saying get a label on the result page", OUTCOME_LABELS.SCORED === undefined && OUTCOME_LABELS.ENDED_BY_PROCTORING === "Ended by proctoring" && OUTCOME_LABELS.UNDER_REVIEW === "Under review");
check("events read as words", eventLabel("FULLSCREEN_EXIT") === "Left fullscreen" && eventLabel("SOME_NEW_EVENT") === "some new event");

check("no analysis says so", analysisLine(null) === "Not analysed");
check("a failed analysis says why", analysisLine({ status: "UNAVAILABLE", errorCode: "TIMEOUT" }) === "Not analysed (TIMEOUT)");
check("a phone reads with its confidence, for staff", analysisLine({ status: "OK", classification: "ONE_FACE", faceScores: [0.91], objects: [{ label: "cell phone", score: 0.72 }] }) === "One face · face 91% · cell phone 72%");
check("no face reads plainly", analysisLine({ status: "OK", classification: "NO_FACE", faceScores: [], objects: [] }) === "No face");
check("two faces read plainly", analysisLine({ status: "OK", classification: "MULTIPLE_FACES", facesDetected: 2, faceScores: [0.9, 0.7], objects: [] }) === "2 faces · face 90%");
check("identity reads as match or not, with the figure", analysisLine({ status: "OK", classification: "ONE_FACE", faceScores: [0.9], objects: [], identity: { status: "MISMATCH", similarity: 0.12 } }).includes("does not match identity photo (0.12)"));
check("looking away is noted", analysisLine({ status: "OK", classification: "ONE_FACE", faceScores: [0.9], objects: [], headPose: { orientation: "AWAY", direction: "LEFT" } }).includes("looking left"));

// ---- leaving fullscreen without Esc ----
// Under Keyboard Lock Esc reaches the page, so an exit with no Esc came another way: the browser's own X.
check("an exit under the lock with no Esc points to the browser's exit button", /not through esc/i.test(fullscreenExitDetail({ escHeldMs: null, keyboardLock: "active" }) || "") && /exit button/i.test(fullscreenExitDetail({ escHeldMs: null, keyboardLock: "active" })));
check("a held Esc is not called a button exit", !/exit button/i.test(fullscreenExitDetail({ escHeldMs: 1600, keyboardLock: "active" }) || ""));
check("without the lock, Esc cannot be ruled out", !/exit button/i.test(fullscreenExitDetail({ escHeldMs: null, keyboardLock: "refused" }) || ""));

// ---- the banner at the top of the review ----
{
    const ended = reviewOutcome({ status: "TERMINATED", terminationRule: "WARNING_LIMIT_REACHED", warningCount: 3, maxWarnings: 3, isFlagged: true, flags: [] });
    check("an exam ended at the warning limit says so, with the count", ended.kind === "PROCTORING" && ended.title === "Ended by proctoring" && ended.detail === "Reached the maximum warning limit (3 / 3)");
    const phone = reviewOutcome({ status: "TERMINATED", terminationRule: "CONFIRMED_PROHIBITED_OBJECT", warningCount: 1, maxWarnings: 3, flags: [] });
    check("an exam ended by a phone gives the rule, without a count", phone.detail === "A phone stayed in view");
    const unknown = reviewOutcome({ status: "TERMINATED", terminationRule: "SOMETHING_NEW", terminationReason: "Ended for a new reason.", flags: [] });
    check("an unknown rule falls back to the server's reason", unknown.detail === "Ended for a new reason.");
    const flagged = reviewOutcome({ status: "SUBMITTED", isFlagged: true, flags: [{ reason: "PERSISTENT_ABSENCE" }, { reason: "AI_UNAVAILABLE" }] });
    check("a flagged attempt leads with its first flag and counts the rest", flagged.kind === "FLAGGED" && flagged.title === "Flagged for review" && flagged.detail === "The student was away from the camera, and 1 more");
    const clear = reviewOutcome({ status: "SUBMITTED", isFlagged: false, flags: [] });
    check("a clean attempt says there were no concerns", clear.kind === "CLEAR" && clear.title === "No concerns");
}

// ---- the warning cards ----
{
    const evidence = [
        { id: "ev1", frameId: "f1", receivedAt: "2026-11-03T06:42:26Z" },
        { id: "ev2", frameId: "f2", receivedAt: "2026-11-03T06:43:08Z" },
        { id: "ev4", frameId: "f4", receivedAt: "2026-11-03T06:42:34Z" },
    ];
    const events = [
        { id: "a", eventType: "IDENTITY_MISMATCH_DETECTED", warningIssued: true, timestamp: "2026-11-03T06:42:26Z", metadata: { evidenceIds: ["f1"], signalConfidence: 0.81 } },
        { id: "b", eventType: "PROHIBITED_OBJECT_DETECTED", warningIssued: false, timestamp: "2026-11-03T06:42:34Z", metadata: { evidenceIds: ["f4"] } },
        { id: "c", eventType: "FULLSCREEN_EXIT", warningIssued: true, timestamp: "2026-11-03T06:43:08Z", metadata: { evidenceIds: ["missing", "f2"], escHeldMs: null, keyboardLock: "active" } },
        { id: "d", eventType: "FULLSCREEN_ENTER", warningIssued: false, timestamp: "2026-11-03T06:43:13Z", metadata: {} },
        { id: "e", eventType: "FULLSCREEN_EXIT", warningIssued: true, timestamp: "2026-11-03T06:43:18Z", metadata: {} },
        { id: "f", eventType: "AUTO_TERMINATION_ENFORCED", warningIssued: false, timestamp: "2026-11-03T06:43:18Z", metadata: {} },
    ];
    const { featured, endingEvent, others } = reviewWarnings(events, evidence, { terminated: true });
    check("each warning becomes a numbered card, in order", featured.map((card) => card.warningNumber).join() === "1,2,3" && featured.map((card) => card.id).join() === "a,c,e");
    check("a card uses the first of its photos that is still held", featured[1].evidenceId === "ev2" && featured[1].evidenceCapturedAt === "2026-11-03T06:43:08Z");
    check("a card with no photo held says so with no id", featured[2].evidenceId === null);
    check("a card carries the detail a reviewer needs", featured[0].note === "Confidence 81%" && /exit button/i.test(featured[1].note));
    check("the ending is kept apart from the cards", endingEvent?.id === "f" && !featured.some((card) => card.id === "f"));
    check("returning to fullscreen is not listed as something that happened", !others.some((row) => row.id === "d"));
    check("an event that did not warn is folded away as recorded only", others.map((row) => row.id).join() === "b");

    const noWarnings = reviewWarnings(events.map((event) => ({ ...event, warningIssued: false })), evidence, { terminated: true });
    check("an exam ended with no warnings shows its last moments that have photos", noWarnings.featured.map((card) => card.id).join() === "a,b,c" && noWarnings.featured.every((card) => card.warningNumber === null));
    const quiet = reviewWarnings(events.map((event) => ({ ...event, warningIssued: false })), evidence, { terminated: false });
    check("a finished exam with no warnings has no cards", quiet.featured.length === 0 && quiet.others.length === 4);
}

if (failed > 0) process.exit(1);

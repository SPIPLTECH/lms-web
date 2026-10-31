import { DECISION_DONE, DECISION_FOR_STUDENT, DECISION_OPTIONS, FLAG_REASON_LABELS, OUTCOME_LABELS, TERMINATION_RULE_LABELS, analysisLine, eventLabel, flagReasonLabel, needsDecisionNote } from "../proctoring/reviewLabels.js";

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
check("the two rules that can end an exam have words", Boolean(TERMINATION_RULE_LABELS.CONFIRMED_PROHIBITED_OBJECT && TERMINATION_RULE_LABELS.PERSISTENT_MULTIPLE_FACES));
check("only outcomes that need saying get a label on the result page", OUTCOME_LABELS.SCORED === undefined && OUTCOME_LABELS.ENDED_BY_PROCTORING === "Ended by proctoring" && OUTCOME_LABELS.UNDER_REVIEW === "Under review");
check("events read as words", eventLabel("FULLSCREEN_EXIT") === "Left fullscreen" && eventLabel("SOME_NEW_EVENT") === "some new event");

check("no analysis says so", analysisLine(null) === "Not analysed");
check("a failed analysis says why", analysisLine({ status: "UNAVAILABLE", errorCode: "TIMEOUT" }) === "Not analysed (TIMEOUT)");
check("a phone reads with its confidence, for staff", analysisLine({ status: "OK", classification: "ONE_FACE", faceScores: [0.91], objects: [{ label: "cell phone", score: 0.72 }] }) === "One face · face 91% · cell phone 72%");
check("no face reads plainly", analysisLine({ status: "OK", classification: "NO_FACE", faceScores: [], objects: [] }) === "No face");
check("two faces read plainly", analysisLine({ status: "OK", classification: "MULTIPLE_FACES", facesDetected: 2, faceScores: [0.9, 0.7], objects: [] }) === "2 faces · face 90%");
check("identity reads as match or not, with the figure", analysisLine({ status: "OK", classification: "ONE_FACE", faceScores: [0.9], objects: [], identity: { status: "MISMATCH", similarity: 0.12 } }).includes("does not match identity photo (0.12)"));
check("looking away is noted", analysisLine({ status: "OK", classification: "ONE_FACE", faceScores: [0.9], objects: [], headPose: { orientation: "AWAY", direction: "LEFT" } }).includes("looking left"));

if (failed > 0) process.exit(1);

/**
 * Maps a composer quiz block's local, index-based answer representation
 * onto the backend Question model, whose validator only accepts a small
 * set of questionTypes and requires correctAnswer to be the literal
 * option TEXT (not an index) — see lms-api's questionValidator.js.
 *
 * Composer's quizConfig.correctAnswer shape, by answerType:
 *   chooseOne         -> [optionIndex]
 *   chooseMultiple     -> [optionIndex, ...]
 *   fill-in-the-blanks -> [answerText, ...]  (one entry per blank)
 *   arrange-in-order   -> [optionIndex, ...] (desired order)
 *   connect-pairs      -> [[leftIndex, rightIndex], ...]
 *
 * Only chooseOne, chooseMultiple, and single-blank fill-in-the-blanks map
 * cleanly to a backend-gradable Question. arrange-in-order, connect-pairs,
 * and multi-blank fill-in-the-blanks stay composer-only (fully authored/
 * previewed, persisted in Content.data, but never sent to /questions).
 */

export function isBackendGradable(quizConfig) {
  if (!quizConfig) return false;

  switch (quizConfig.answerType) {
    case "chooseOne":
    case "chooseMultiple":
      return true;
    case "fill-in-the-blanks":
      return (quizConfig.correctAnswer || []).length === 1;
    default:
      return false;
  }
}

/** Returns { questionType, correctAnswer } in backend shape, or null if not gradable. */
export function mapAnswerToBackendQuestion(quizConfig) {
  if (!isBackendGradable(quizConfig)) return null;

  const options = quizConfig.options || [];
  const correctAnswer = quizConfig.correctAnswer || [];

  switch (quizConfig.answerType) {
    case "chooseOne":
      return {
        questionType: "MCQ",
        correctAnswer: options[correctAnswer[0]],
      };
    case "chooseMultiple":
      return {
        questionType: "MULTIPLE_CORRECT",
        correctAnswer: correctAnswer.map((i) => options[i]),
      };
    case "fill-in-the-blanks":
      return {
        questionType: "FILL_BLANK",
        correctAnswer: correctAnswer[0],
      };
    default:
      return null;
  }
}

/** Builds the /questions POST/PUT body for a gradable quiz block, or null if not gradable. */
export function buildQuestionPayload(quizConfig, { courseId, moduleId, quizId }) {
  const mapped = mapAnswerToBackendQuestion(quizConfig);
  if (!mapped) return null;

  return {
    quizId,
    courseId,
    moduleId,
    question: quizConfig.question || "",
    questionType: mapped.questionType,
    options: quizConfig.options || [],
    correctAnswer: mapped.correctAnswer,
    explanation: quizConfig.explanation || "",
    marks: quizConfig.points || 1,
    order: 1,
  };
}

export function buildQuizPayload(quizConfig, { courseId, lessonTitle }) {
  return {
    title: `${lessonTitle} — Quiz`,
    courseId,
    passingScore: 60,
    isPublished: false,
    status: "DRAFT",
    // This quiz only backs the block's question; the block's own Content row
    // is its place in the lesson, so the quiz is not a sequence item itself.
    inSequence: false,
  };
}

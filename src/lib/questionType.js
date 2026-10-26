// The API/DB QuestionType enum (prisma/schema.prisma) has two synonym pairs
// the quiz UI doesn't know: "MCQ" for a single-choice question and
// "MULTIPLE_CORRECT" for a multi-choice one. Everywhere the UI branches on a
// question's type (QuestionCard, QuestionReviewCard, QuizExperience) and
// wherever quizAnswers.js grades an answer, it needs the UI's own keys
// (MCQ_SINGLE/MCQ_MULTI/...), not the raw API value — this is the one place
// that translation happens, so every consumer stays in agreement.
//
// ARRANGE_TOKENS and MATCH_PAIRS already match the UI's keys and pass
// through unchanged.
//
// TRUE_FALSE is a single-choice question whose options are "True" and
// "False" — the same rule the composer's import applies — and is answered,
// graded and reviewed exactly as one. It has to be translated: the server
// files any single-choice question with exactly those two options under
// TRUE_FALSE when it saves, and the student screen draws nothing for a type
// it has no branch for, so such a question showed no options at all.
//
// FILL_BLANK/SHORT_ANSWER/LONG_ANSWER have no dedicated UI or grading branch
// yet (see QuestionCard.jsx/quizAnswers.js) — they pass through as-is rather
// than being silently coerced to the wrong type; adding real support for them
// is separate, future work.
const QUESTION_TYPE_ALIASES = {
  MCQ: "MCQ_SINGLE",
  MULTIPLE_CORRECT: "MCQ_MULTI",
  TRUE_FALSE: "MCQ_SINGLE",
};

/** A True/False question stored without its two options still offers them. */
export const TRUE_FALSE_OPTIONS = ["True", "False"];

/**
 * Types withdrawn from the authoring pickers: an instructor can no longer
 * create one. Nothing else changes — the API enum still accepts them, and a
 * question written before they were withdrawn keeps its type and is still
 * delivered — so the pickers fall back to showing one of these only when the
 * question being edited already carries it. Dropping the option outright
 * would leave such a question displaying the first entry in the list instead
 * of what it actually is.
 */
/**
 * The only question types the UI offers, in the order every picker shows
 * them. Type pickers and type filters alike render this list and nothing
 * else, so the wording stays identical wherever a type is chosen.
 */
export const QUESTION_TYPE_OPTIONS = [
  { value: "MCQ_SINGLE", label: "Single Choice (MCQ)" },
  { value: "MCQ_MULTI", label: "Multiple Choice (MCQ)" },
  { value: "ARRANGE_TOKENS", label: "Arrange Tokens" },
  { value: "MATCH_PAIRS", label: "Match Pairs" },
];

export const RETIRED_QUESTION_TYPES = {
  TRUE_FALSE: "True / False",
  FILL_BLANK: "Fill in Blanks",
  SHORT_ANSWER: "Short Answer",
  LONG_ANSWER: "Long Answer",
  SELF_ASSESSMENT: "Self Assessment",
};

/**
 * Resolves a question's raw `questionType` (from the API) to the UI's
 * internal type key. Missing/falsy defaults to "MCQ_SINGLE", matching every
 * call site's previous fallback.
 */
export function resolveQuestionType(questionType) {
  if (!questionType) return "MCQ_SINGLE";
  return QUESTION_TYPE_ALIASES[questionType] || questionType;
}

// Shared "is this answer correct" check for quiz review/scoring UI — one
// rule per question type, used wherever a submitted answer needs comparing
// against a question's correctAnswer (result summary counts, per-question
// review highlighting).
// The stored key for a single-answer question can be a plain string or a
// one-element array (how imported/generated questions arrive), and the
// backend scorer compares trimmed, case-insensitive text. The review has to
// apply the same rule, or an answer the server scored as right is shown as
// "Incorrect Choice" underneath a full score.
const normalizeAnswerText = (value) => String(value ?? "").trim().toLowerCase();
const asAnswerList = (value) => (Array.isArray(value) ? value : [value]);

// Whether one option is (one of) the correct answer(s), by the same trimmed,
// case-insensitive text rule — for marking options right or wrong once a
// Self-Test answer has been checked.
export function isCorrectOption(optionText, correct) {
  if (correct === undefined || correct === null || correct === "") return false;
  return asAnswerList(correct).some((c) => normalizeAnswerText(c) === normalizeAnswerText(optionText));
}

export function checkAnswerCorrectness(type, selected, correct) {
  if (selected === undefined || selected === null) return false;

  if (type === "MCQ_SINGLE") {
    return asAnswerList(correct).some((c) => normalizeAnswerText(c) === normalizeAnswerText(selected));
  }

  if (type === "MCQ_MULTI") {
    if (!Array.isArray(selected) || !Array.isArray(correct)) return false;
    // Same trimmed, case-insensitive text rule as the server's scorer, so a
    // review never calls an answer wrong that was scored right.
    const key = correct.map(normalizeAnswerText);
    return selected.length === correct.length && selected.every((v) => key.includes(normalizeAnswerText(v)));
  }

  if (type === "ARRANGE_TOKENS") {
    if (!Array.isArray(selected) || !Array.isArray(correct)) return false;
    return selected.length === correct.length && selected.every((v, i) => v === correct[i]);
  }

  if (type === "MATCH_PAIRS") {
    if (typeof selected !== "object" || typeof correct !== "object" || !selected || !correct) return false;
    const selKeys = Object.keys(selected);
    const corrKeys = Object.keys(correct);
    if (selKeys.length !== corrKeys.length) return false;
    return selKeys.every((k) => String(selected[k]) === String(correct[k]));
  }

  if (type === "SELF_ASSESSMENT") {
    return typeof selected === "string" && selected.trim().length > 0;
  }

  return false;
}

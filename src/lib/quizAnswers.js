// Shared "is this answer correct" check for quiz review/scoring UI — one
// rule per question type, used wherever a submitted answer needs comparing
// against a question's correctAnswer (result summary counts, per-question
// review highlighting).
// The stored key for a single-answer question can be a plain string or a
// one-element array (how imported/generated questions arrive). A choice
// answer is an option's own text, so it is compared exactly, case included:
// options can differ only by case ("int float" / "int Float") or, in code,
// only by indentation, and are then different answers. A plain one-line
// option may differ from the key by repeated spaces, but only when that
// cannot make two of the question's options the same answer.
//
// This is the server's rule (lms-api/src/utils/choiceAnswer.js), kept
// identical — matching it is what keeps the review from calling a scored
// answer wrong.
const asAnswerList = (value) => (Array.isArray(value) ? value : [value]);

const exactChoiceText = (value) => String(value ?? "").replace(/\r\n?/g, "\n").trim();
const looseChoiceText = (value) => exactChoiceText(value).replace(/\s+/g, " ");

/** Inline `code`, a ``` block, or several lines: its spacing is part of the answer. */
export const isCodeChoice = (value) => /`|\n/.test(exactChoiceText(value));

// Question.options as display texts: plain strings, objects, or a JSON
// string of either.
function choiceOptionTexts(options) {
  let list = options;
  if (typeof list === "string") {
    try {
      list = JSON.parse(list);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  return list.map((opt) =>
    opt && typeof opt === "object" ? String(opt.optionText ?? opt.text ?? "") : String(opt ?? "")
  );
}

function choiceMatches(selected, correct, options) {
  const picked = exactChoiceText(selected);
  const key = exactChoiceText(correct);
  if (!picked || !key) return false;
  if (picked === key) return true;
  if (isCodeChoice(picked) || isCodeChoice(key)) return false;

  const loose = looseChoiceText(key);
  if (looseChoiceText(picked) !== loose) return false;
  return choiceOptionTexts(options).filter((text) => looseChoiceText(text) === loose).length <= 1;
}

/**
 * Two options that the space allowance would treat as one answer — shown to
 * the instructor as a warning before saving. Returns their indexes.
 */
export function findLooselyDuplicateOptions(optionTexts = []) {
  const seen = new Map();
  for (const [index, text] of optionTexts.entries()) {
    if (!exactChoiceText(text) || isCodeChoice(text)) continue;
    const loose = looseChoiceText(text);
    if (seen.has(loose)) return [seen.get(loose), index];
    seen.set(loose, index);
  }
  return null;
}

// Whether one option is (one of) the correct answer(s), by the same rule —
// for marking options right or wrong once an answer is known. `options` are
// the question's own (any order).
export function isCorrectOption(optionText, correct, options) {
  if (correct === undefined || correct === null || correct === "") return false;
  return asAnswerList(correct).some((c) => choiceMatches(optionText, c, options));
}

export function checkAnswerCorrectness(type, selected, correct, options) {
  if (selected === undefined || selected === null) return false;

  if (type === "MCQ_SINGLE") {
    return asAnswerList(correct).some((c) => choiceMatches(selected, c, options));
  }

  if (type === "MCQ_MULTI") {
    if (!Array.isArray(selected) || !Array.isArray(correct)) return false;
    return (
      selected.length === correct.length &&
      selected.every((v) => correct.some((c) => choiceMatches(v, c, options)))
    );
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

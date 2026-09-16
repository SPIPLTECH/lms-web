/**
 * What the quiz Listen buttons say — builds the ordered sentence list for a
 * question, a submitted result, or one reviewed answer. Pure functions over
 * the same data the quiz components render, so what's heard matches what's
 * on screen (including the shuffled option order). See ListenButton.
 *
 * The timer is deliberately never part of any of these.
 */

import { asSentence, textsToChunks } from "./textToSpeech.js";
import { checkAnswerCorrectness } from "./quizAnswers.js";

export const optionText = (opt) => {
  if (opt === null || opt === undefined) return "";
  if (typeof opt === "string") return opt;
  if (typeof opt === "object") return opt.optionText || opt.text || "";
  return String(opt);
};

const letter = (index) => String.fromCharCode(65 + index);

const listSentence = (items) => asSentence(items.map(optionText).filter(Boolean).join(", "));

const QUESTION_INSTRUCTIONS = {
  MCQ_SINGLE: "Choose one answer.",
  MCQ_MULTI: "Select all options that apply.",
  ARRANGE_TOKENS: "Arrange the tokens in the correct order.",
  MATCH_PAIRS: "Match each item in the first column with an item in the second column.",
  SELF_ASSESSMENT: "Type your answer in the box provided.",
};

// Questions don't carry a hint field today; read one if the API ever sends it.
function hintTexts(question) {
  const raw = question?.hint ?? question?.hints;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return list
    .map((h) => (typeof h === "string" ? h : h?.text || ""))
    .filter((h) => h && h.trim())
    .map((h) => `Hint: ${asSentence(h)}`);
}

/**
 * A question as the student sees it: question text, then the choices in
 * their displayed order, then how to answer, then any hint.
 *
 * @param {object} args
 * @param {object} args.question
 * @param {string} args.type            Resolved UI type (resolveQuestionType).
 * @param {Array}  [args.options]       Displayed option/token order.
 * @param {{columnA: Array, columnB: Array}} [args.matchOptions]
 * @param {number} [args.questionNumber]
 * @param {number} [args.totalQuestions]
 */
export function buildQuestionSpeech({
  question,
  type,
  options = [],
  matchOptions = null,
  questionNumber,
  totalQuestions,
  lang = "",
  readOptions = true,
  readHints = true,
}) {
  if (!question) return [];
  const texts = [];

  if (questionNumber && totalQuestions) texts.push(`Question ${questionNumber} of ${totalQuestions}.`);
  texts.push(asSentence(question.question));

  if (readOptions) {
    if ((type === "MCQ_SINGLE" || type === "MCQ_MULTI") && options.length) {
      texts.push("Answer choices.");
      options.forEach((opt, i) => {
        const text = optionText(opt);
        if (text) texts.push(asSentence(`${letter(i)}. ${text}`));
      });
    } else if (type === "ARRANGE_TOKENS" && options.length) {
      texts.push(`Tokens: ${listSentence(options)}`);
    } else if (type === "MATCH_PAIRS" && matchOptions) {
      const colA = matchOptions.columnA || [];
      const colB = matchOptions.columnB || [];
      if (colA.length) texts.push(`First column: ${listSentence(colA)}`);
      if (colB.length) texts.push(`Second column: ${listSentence(colB)}`);
    }
  }

  if (QUESTION_INSTRUCTIONS[type]) texts.push(QUESTION_INSTRUCTIONS[type]);
  if (readHints) texts.push(...hintTexts(question));

  return textsToChunks(texts, lang);
}

/** The inline "quiz submitted" summary. */
export function buildResultSummarySpeech({ quizTitle, passed, correctCount, totalQuestions, percentage, lang = "" }) {
  return textsToChunks(
    [
      quizTitle ? asSentence(`${quizTitle} submitted`) : "Quiz submitted.",
      passed ? "You passed." : "You did not pass this time.",
      `You answered ${correctCount} of ${totalQuestions} questions correctly.`,
      `Your score is ${percentage} percent.`,
    ],
    lang
  );
}

/** The result page overview (score, marks, pass mark, counts). */
export function buildResultOverviewSpeech({ submission, lang = "" }) {
  if (!submission) return [];
  const { quiz, score, totalMarks, percentage, passed } = submission;
  const graded = Number(totalMarks) > 0;
  const texts = [asSentence(`Result for ${quiz?.title || "this quiz"}`)];

  if (graded) {
    texts.push(passed ? "You passed." : "You did not pass.");
    texts.push(`Your score is ${percentage} percent, ${score} out of ${totalMarks} marks.`);
    texts.push(`The pass mark is ${quiz?.passingScore ?? 70} percent.`);
  } else {
    texts.push("This attempt has been submitted and is not graded yet.");
  }
  if (submission.correctCount != null) texts.push(`Correct: ${submission.correctCount}.`);
  if (submission.incorrectCount != null) texts.push(`Incorrect: ${submission.incorrectCount}.`);
  if (submission.unansweredCount) texts.push(`Unanswered: ${submission.unansweredCount}.`);
  return textsToChunks(texts, lang);
}

function parseOptions(options) {
  if (typeof options === "string") {
    try {
      const parsed = JSON.parse(options);
      return Array.isArray(parsed) ? parsed : [options];
    } catch {
      return [options];
    }
  }
  return Array.isArray(options) ? options : [];
}

/**
 * One reviewed answer after submission: the question, the student's answer,
 * whether it was right, the correct answer when it wasn't, and the
 * explanation.
 */
export function buildAnswerReviewSpeech({ question, index, type, selectedOption, lang = "" }) {
  if (!question) return [];
  const texts = [asSentence(`Question ${index + 1}. ${question.question}`)];
  const answered =
    selectedOption !== undefined &&
    selectedOption !== null &&
    selectedOption !== "" &&
    !(Array.isArray(selectedOption) && selectedOption.length === 0);
  const isCorrect = checkAnswerCorrectness(type, selectedOption, question.correctAnswer);
  const correct = question.correctAnswer;

  if (type === "MCQ_SINGLE" || type === "MCQ_MULTI") {
    const opts = parseOptions(question.options);
    const correctTexts = opts
      .filter((opt) =>
        type === "MCQ_SINGLE"
          ? checkAnswerCorrectness("MCQ_SINGLE", optionText(opt), correct) || (typeof opt === "object" && opt?.isCorrect)
          : Array.isArray(correct) && correct.includes(optionText(opt))
      )
      .map(optionText);
    if (answered) {
      const yours = Array.isArray(selectedOption) ? selectedOption : [selectedOption];
      texts.push(`Your answer: ${listSentence(yours)}`);
    }
    texts.push(!answered ? "You did not answer this question." : isCorrect ? "That is correct." : "That is incorrect.");
    if (!isCorrect && correctTexts.length) {
      texts.push(`${correctTexts.length > 1 ? "Correct answers" : "Correct answer"}: ${listSentence(correctTexts)}`);
    }
  } else if (type === "ARRANGE_TOKENS") {
    texts.push(answered ? `Your sequence: ${listSentence(selectedOption)}` : "You did not answer this question.");
    if (answered) texts.push(isCorrect ? "That is correct." : "That is incorrect.");
    if (!isCorrect && Array.isArray(correct)) texts.push(`Correct sequence: ${listSentence(correct)}`);
  } else if (type === "MATCH_PAIRS") {
    const pairs = Object.entries(correct || {});
    if (!answered) texts.push("You did not answer this question.");
    else texts.push(isCorrect ? "All matches are correct." : "Some matches are incorrect.");
    pairs.forEach(([left, right]) => {
      const yours = selectedOption?.[left];
      if (yours === right) texts.push(asSentence(`${left} matched with ${right}, correct`));
      else texts.push(asSentence(`${left}: ${yours ? `you chose ${yours}` : "no match selected"}; expected ${right}`));
    });
  } else if (type === "SELF_ASSESSMENT") {
    texts.push(answered ? `Your written answer: ${asSentence(selectedOption)}` : "You did not write an answer.");
    if (correct) texts.push(`Evaluation key: ${asSentence(String(correct))}`);
  } else {
    texts.push(!answered ? "You did not answer this question." : isCorrect ? "That is correct." : "That is incorrect.");
  }

  if (question.explanation && String(question.explanation).trim()) {
    texts.push(`Explanation: ${asSentence(question.explanation)}`);
  }

  return textsToChunks(texts, lang);
}

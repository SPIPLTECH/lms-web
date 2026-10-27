import {
  allQuestionsChecked,
  createAttemptState,
  markAnswerChecked,
  setAnswer,
  summarize,
  toQuestionStatesPayload,
} from "../quizAttemptState.js";
import { checkAnswerCorrectness, isCorrectOption } from "../quizAnswers.js";

// A checked Self-Test answer is final: the student has seen the key, so
// changing the answer afterwards would only copy it.
function runTests() {
  const questions = [{ id: "q1" }, { id: "q2" }];
  const answered = setAnswer(createAttemptState(questions), "q1", "func");
  const checked = markAnswerChecked(answered, "q1");

  const bothChecked = markAnswerChecked(setAnswer(checked, "q2", "def"), "q2");

  const testCases = [
    {
      name: "a Self-Test is not finished while a question is still unchecked",
      actual: allQuestionsChecked(checked, questions),
      expected: false,
    },
    {
      name: "a Self-Test is finished once every question is checked",
      actual: allQuestionsChecked(bothChecked, questions),
      expected: true,
    },
    {
      name: "a quiz with no questions is never 'all checked' (nothing to save)",
      actual: allQuestionsChecked({}, []),
      expected: false,
    },
    {
      name: "the summary counts checked questions",
      actual: `${summarize(checked, questions).checkedCount}/${summarize(bothChecked, questions).checkedCount}`,
      expected: "1/2",
    },
    {
      name: "checking an answered question marks it checked",
      actual: checked.q1.answerChecked,
      expected: true,
    },
    {
      name: "a checked answer can't be changed",
      actual: setAnswer(checked, "q1", "def").q1.answer,
      expected: "func",
    },
    {
      name: "a checked answer can't be cleared",
      actual: setAnswer(checked, "q1", null).q1.answered,
      expected: true,
    },
    {
      name: "an unanswered question can't be checked",
      actual: markAnswerChecked(answered, "q2").q2.answerChecked,
      expected: false,
    },
    {
      name: "other questions stay editable",
      actual: setAnswer(checked, "q2", "def").q2.answer,
      expected: "def",
    },
    {
      name: "the check stays client-side and is not sent with the attempt",
      actual: toQuestionStatesPayload(checked).some((row) => "answerChecked" in row),
      expected: false,
    },
    {
      name: "isCorrectOption ignores surrounding spaces",
      actual: isCorrectOption("  def ", "def"),
      expected: true,
    },
    {
      name: "isCorrectOption tells options apart by case (int float vs int Float)",
      actual: `${isCorrectOption("int float = 4;", "int Float = 4;")}/${isCorrectOption("int Float = 4;", "int Float = 4;")}`,
      expected: "false/true",
    },
    {
      name: "a single answer in the wrong case is wrong, as the server scores it",
      actual: checkAnswerCorrectness("MCQ_SINGLE", "int float = 4;", ["int Float = 4;"]),
      expected: false,
    },
    {
      name: "isCorrectOption matches one entry of a multi-answer key",
      actual: isCorrectOption("5", ["2", "5"]),
      expected: true,
    },
    {
      name: "isCorrectOption rejects a wrong option",
      actual: isCorrectOption("4", ["2", "5"]),
      expected: false,
    },
    {
      name: "isCorrectOption with no key marks nothing correct",
      actual: isCorrectOption("", ""),
      expected: false,
    },
    {
      name: "a multi answer is matched exactly, spaces aside, as the server scores it",
      actual: `${checkAnswerCorrectness("MCQ_MULTI", ["Paris ", "Rome"], ["Paris", "Rome"])}/${checkAnswerCorrectness("MCQ_MULTI", ["paris", "Rome"], ["Paris", "Rome"])}`,
      expected: "true/false",
    },
    {
      name: "a multi answer missing one correct option is still wrong",
      actual: checkAnswerCorrectness("MCQ_MULTI", ["paris"], ["paris", "rome"]),
      expected: false,
    },
    {
      name: "a multi answer with an extra wrong option is still wrong",
      actual: checkAnswerCorrectness("MCQ_MULTI", ["paris", "rome", "oslo"], ["paris", "rome"]),
      expected: false,
    },
  ];

  let passed = 0;
  let failed = 0;

  console.log("=== RUNNING SELF-TEST ANSWER CHECK TESTS ===");
  testCases.forEach((tc) => {
    if (tc.actual === tc.expected) {
      console.log(`[PASS] ${tc.name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${tc.name}`);
      console.error("  Expected:", tc.expected);
      console.error("  Actual:  ", tc.actual);
      failed++;
    }
  });

  console.log(`\nRESULTS: ${passed} Passed, ${failed} Failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

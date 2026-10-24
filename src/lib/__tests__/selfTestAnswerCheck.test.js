import { createAttemptState, markAnswerChecked, setAnswer, toQuestionStatesPayload } from "../quizAttemptState.js";
import { checkAnswerCorrectness, isCorrectOption } from "../quizAnswers.js";

// A checked Self-Test answer is final: the student has seen the key, so
// changing the answer afterwards would only copy it.
function runTests() {
  const questions = [{ id: "q1" }, { id: "q2" }];
  const answered = setAnswer(createAttemptState(questions), "q1", "func");
  const checked = markAnswerChecked(answered, "q1");

  const testCases = [
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
      name: "isCorrectOption matches a string key ignoring case and spaces",
      actual: isCorrectOption("  Def ", "def"),
      expected: true,
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
      name: "a multi answer differing from the key only in case counts as right, as the server scores it",
      actual: checkAnswerCorrectness("MCQ_MULTI", ["Paris ", "rome"], ["paris", "Rome"]),
      expected: true,
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

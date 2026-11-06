import { checkAnswerCorrectness, findLooselyDuplicateOptions, isCorrectOption } from "../quizAnswers.js";
import { isRichQuizText, quizTextForSpeech, quizTextSummary, resolveQuizCodeLanguage } from "../quizText.js";
import { buildQuestionSpeech } from "../quizSpeech.js";

// Quiz text that holds code: when it counts as Markdown, how read-aloud and
// list rows flatten it, and — the part that must match the server's
// lms-api/src/utils/choiceAnswer.js — how a code option is graded.
const INSIDE = "```python\nfor i in range(3):\n    print(i)\n    print(\"done\")\n```";
const OUTSIDE = "```python\nfor i in range(3):\n    print(i)\nprint(\"done\")\n```";
const IMAGE = "![Image](https://files.example.com/content-uploads/chart.png)";

function runTests() {
  const testCases = [
    {
      name: "plain text with ___ blanks, a < b, 2 * 3 and a lone # is not Markdown",
      actual: [
        "She has been working here ___ 2022.",
        "if a<b and c>d",
        "2 * 3 * 4",
        "#",
        "Choose the word closest in meaning.\nDEFUNCT:",
      ].some(isRichQuizText),
      expected: false,
    },
    {
      name: "inline code, a code block or **bold** makes it Markdown",
      actual: ["What does `x++` do?", INSIDE, "Which is **NOT** true?"].every(isRichQuizText),
      expected: true,
    },
    {
      name: "read-aloud names a code block instead of reading its symbols",
      actual: quizTextForSpeech(`What does this print?\n\n${INSIDE}`),
      expected: "What does this print? Python code shown on screen.",
    },
    {
      name: "read-aloud drops backticks and bold markers",
      actual: quizTextForSpeech("Which is **NOT** true of `23 MOD 4`?"),
      expected: "Which is NOT true of 23 MOD 4?",
    },
    {
      name: "plain text is read exactly as written",
      actual: quizTextForSpeech("if a<b and 2 * 3"),
      expected: "if a<b and 2 * 3",
    },
    {
      name: "a list row shows a code block as [code]",
      actual: quizTextSummary(`What does this print?\n${INSIDE}`),
      expected: "What does this print? [code]",
    },
    {
      name: "an image makes it Markdown; a lone ! or [ does not",
      actual: [isRichQuizText(IMAGE), isRichQuizText("Wow! See [1] (page 2)."), isRichQuizText("a![0] (b)")].join(),
      expected: "true,false,false",
    },
    {
      name: "read-aloud names an image instead of reading its address",
      actual: quizTextForSpeech(`What does this chart show?\n${IMAGE}`),
      expected: "What does this chart show? Image shown on screen.",
    },
    {
      name: "a list row shows an image as [image]",
      actual: quizTextSummary(`What does this chart show?\n${IMAGE}`),
      expected: "What does this chart show? [image]",
    },
    {
      name: "a question's options are spoken without code symbols",
      actual: buildQuestionSpeech({
        question: { question: "Which loop prints done once?" },
        type: "MCQ_SINGLE",
        options: [INSIDE, OUTSIDE],
      })
        .join(" ")
        .includes("A. Python code shown on screen."),
      expected: true,
    },
    {
      name: "a code fence's language resolves through its aliases",
      actual: [resolveQuizCodeLanguage("py"), resolveQuizCodeLanguage("C++"), resolveQuizCodeLanguage("cobol")].join("/"),
      expected: "python/cpp/",
    },
    {
      name: "a code option's indentation is part of the answer",
      actual: `${checkAnswerCorrectness("MCQ_SINGLE", OUTSIDE, INSIDE, [INSIDE, OUTSIDE])}/${checkAnswerCorrectness("MCQ_SINGLE", INSIDE, INSIDE, [INSIDE, OUTSIDE])}`,
      expected: "false/true",
    },
    {
      name: "only the right code option is marked correct on review",
      actual: [INSIDE, OUTSIDE].map((opt) => isCorrectOption(opt, INSIDE, [INSIDE, OUTSIDE])).join("/"),
      expected: "true/false",
    },
    {
      name: "Windows line breaks never change a code answer",
      actual: checkAnswerCorrectness("MCQ_SINGLE", INSIDE.replace(/\n/g, "\r\n"), INSIDE),
      expected: true,
    },
    {
      name: "the space allowance never makes two plain options one answer",
      actual: `${isCorrectOption("int  float", "int float", ["int  float", "int float"])}/${isCorrectOption("Paris  France", "Paris France", ["Paris France", "Rome"])}`,
      expected: "false/true",
    },
    {
      name: "two plain options equal but for spaces are flagged to the author",
      actual: JSON.stringify(findLooselyDuplicateOptions(["a", "int float", "b", "int  float"])),
      expected: "[1,3]",
    },
    {
      name: "code options differing only in indentation are not flagged",
      actual: findLooselyDuplicateOptions([INSIDE, OUTSIDE, "", ""]),
      expected: null,
    },
  ];

  let passed = 0;
  let failed = 0;

  console.log("=== RUNNING QUIZ TEXT TESTS ===");
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

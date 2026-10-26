import { resolveQuestionType } from "../questionType.js";

function runTests() {
  const testCases = [
    { name: "MCQ aliases to MCQ_SINGLE", input: "MCQ", expected: "MCQ_SINGLE" },
    { name: "MULTIPLE_CORRECT aliases to MCQ_MULTI", input: "MULTIPLE_CORRECT", expected: "MCQ_MULTI" },
    { name: "MCQ_SINGLE passes through unchanged", input: "MCQ_SINGLE", expected: "MCQ_SINGLE" },
    { name: "MCQ_MULTI passes through unchanged", input: "MCQ_MULTI", expected: "MCQ_MULTI" },
    { name: "ARRANGE_TOKENS passes through unchanged", input: "ARRANGE_TOKENS", expected: "ARRANGE_TOKENS" },
    { name: "MATCH_PAIRS passes through unchanged", input: "MATCH_PAIRS", expected: "MATCH_PAIRS" },
    { name: "TRUE_FALSE is answered as single choice (the server files True/False MCQs under it)", input: "TRUE_FALSE", expected: "MCQ_SINGLE" },
    { name: "an unmapped type (no UI branch yet) still passes through", input: "FILL_BLANK", expected: "FILL_BLANK" },
    { name: "missing type defaults to MCQ_SINGLE", input: undefined, expected: "MCQ_SINGLE" },
    { name: "null type defaults to MCQ_SINGLE", input: null, expected: "MCQ_SINGLE" },
    { name: "empty string defaults to MCQ_SINGLE", input: "", expected: "MCQ_SINGLE" },
  ];

  let passed = 0;
  let failed = 0;

  console.log("=== RUNNING QUESTION TYPE MAPPING TESTS ===");
  testCases.forEach((tc) => {
    const result = resolveQuestionType(tc.input);
    const matches = result === tc.expected;

    if (matches) {
      console.log(`[PASS] ${tc.name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${tc.name}`);
      console.error("  Expected:", tc.expected);
      console.error("  Actual:  ", result);
      failed++;
    }
  });

  console.log(`\nRESULTS: ${passed} Passed, ${failed} Failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

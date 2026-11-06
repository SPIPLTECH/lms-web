/**
 * Who gets Submissions and Certificates: everyone but a student enrolled
 * only in SSC Class 10 courses. Run: node src/lib/__tests__/studentFeatures.test.js
 */
import { isBoardPaperOnlyStudent } from "../studentFeatures.js";

const enrolment = (category) => ({ course: { id: `c-${category}`, category } });

function runTests() {
  const testCases = [
    {
      name: "only the SSC Class 10 course: board-paper only",
      run: () => isBoardPaperOnlyStudent([enrolment("SSC Class 10")]) === true,
    },
    {
      name: "the category matches whatever its case and surrounding spaces",
      run: () => isBoardPaperOnlyStudent([enrolment(" ssc class 10 ")]) === true,
    },
    {
      name: "SSC Class 10 plus any other course: not board-paper only",
      run: () => isBoardPaperOnlyStudent([enrolment("SSC Class 10"), enrolment("C-CAT")]) === false,
    },
    {
      name: "no SSC course at all: not board-paper only",
      run: () => isBoardPaperOnlyStudent([enrolment("C-CAT")]) === false,
    },
    {
      name: "a course with no category is not an SSC course",
      run: () => isBoardPaperOnlyStudent([{ course: { id: "c1" } }]) === false,
    },
    {
      name: "no enrolments yet, or the list not loaded: everything stays visible",
      run: () => isBoardPaperOnlyStudent([]) === false && isBoardPaperOnlyStudent(undefined) === false,
    },
  ];

  let passed = 0;
  let failed = 0;
  testCases.forEach((tc) => {
    if (tc.run()) {
      console.log(`[PASS] ${tc.name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${tc.name}`);
      failed++;
    }
  });

  console.log(`\nRESULTS: ${passed} Passed, ${failed} Failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

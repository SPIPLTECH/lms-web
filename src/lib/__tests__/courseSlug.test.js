/**
 * Readable course keys in student learn URLs (lib/courseSlug.js).
 */
import {
  courseKeyFor,
  isLearnPathFor,
  learnHref,
  learnHrefForId,
  learnKeyFromPath,
  looksLikeCourseId,
  resolveCourseKey,
  slugifyTitle,
} from "../courseSlug.js";
import { resolveTourCourseId } from "../studentOnboarding.js";

const enrolled = (courseId, title) => ({ courseId, course: { id: courseId, title } });

const A = "cmv7xcix70003cm1gawuruyn0";
const B = "cmvavddv300xgem1ygghif9z5";
const ENROLLMENTS = [enrolled(A, "CDAC C-CAT Course - Section A"), enrolled(B, "CDAC C-CAT Course Section B")];

function runTests() {
  const testCases = [
    {
      name: "a title becomes a lowercase hyphenated key",
      run: () =>
        slugifyTitle("CDAC C-CAT Course - Section A") === "cdac-c-cat-course-section-a" &&
        slugifyTitle("  Java: Core & Advanced!  ") === "java-core-advanced" &&
        slugifyTitle("Café Résumé") === "cafe-resume",
    },
    {
      name: "the learn link uses the readable key, never the id",
      run: () =>
        learnHref({ id: A, title: "CDAC C-CAT Course - Section A" }, ENROLLMENTS) ===
          "/student/learn/cdac-c-cat-course-section-a" &&
        learnHrefForId(B, ENROLLMENTS, "item=x") === "/student/learn/cdac-c-cat-course-section-b?item=x",
    },
    {
      name: "a readable key and an old id link both resolve to the course id",
      run: () =>
        resolveCourseKey("cdac-c-cat-course-section-a", ENROLLMENTS) === A &&
        resolveCourseKey(A, ENROLLMENTS) === A &&
        resolveCourseKey("cdac-c-cat-course-section-b", ENROLLMENTS) === B,
    },
    {
      name: "a key that names none of the student's courses resolves to nothing",
      run: () => resolveCourseKey("some-other-course", ENROLLMENTS) === null && resolveCourseKey("", ENROLLMENTS) === null,
    },
    {
      name: "two enrolled courses with the same title get distinct keys that resolve back",
      run: () => {
        const twins = [enrolled("cfirstcourseid0000aaaaaa", "Python"), enrolled("csecondcourseid000bbbbbb", "Python")];
        const first = courseKeyFor({ id: "cfirstcourseid0000aaaaaa", title: "Python" }, twins);
        const second = courseKeyFor({ id: "csecondcourseid000bbbbbb", title: "Python" }, twins);
        return (
          first !== second &&
          first.startsWith("python-") &&
          resolveCourseKey(first, twins) === "cfirstcourseid0000aaaaaa" &&
          resolveCourseKey(second, twins) === "csecondcourseid000bbbbbb"
        );
      },
    },
    {
      name: "a course with no title falls back to its id",
      run: () => learnHref({ id: A, title: "" }, []) === `/student/learn/${A}`,
    },
    {
      name: "course ids are recognised; readable keys are not",
      run: () => looksLikeCourseId(A) && !looksLikeCourseId("cdac-c-cat-course-section-a") && !looksLikeCourseId(null),
    },
    {
      name: "the learn-page check matches by readable key or by id",
      run: () =>
        learnKeyFromPath("/student/learn/cdac-c-cat-course-section-a?item=1") === "cdac-c-cat-course-section-a" &&
        isLearnPathFor("/student/learn/cdac-c-cat-course-section-a", A, ENROLLMENTS) &&
        isLearnPathFor(`/student/learn/${A}`, A, ENROLLMENTS) &&
        !isLearnPathFor("/student/learn/cdac-c-cat-course-section-a", B, ENROLLMENTS) &&
        !isLearnPathFor("/student/my-courses", A, ENROLLMENTS),
    },
    {
      name: "the tour resolves the course of a readable learn URL to its id",
      run: () => resolveTourCourseId("/student/learn/cdac-c-cat-course-section-b", ENROLLMENTS) === B,
    },
    {
      name: "before the enrollments load, a readable key is never taken for a course id",
      run: () => resolveTourCourseId("/student/learn/cdac-c-cat-course-section-b", []) === null,
    },
  ];

  let passed = 0;
  let failed = 0;
  testCases.forEach((tc) => {
    let ok = false;
    try {
      ok = tc.run() === true;
    } catch (error) {
      console.error(error);
    }
    if (ok) {
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

/**
 * Who is offered the first-run onboarding, and which course it opens.
 */
import {
  courseIdOf,
  needsOnboarding,
  resolveTourCourseId,
  sortByRecentAccess,
  TOUR_CHECKLIST,
  TOUR_STEPS,
} from "../studentOnboarding.js";

const student = (profile) => ({ role: "STUDENT", studentProfile: profile });

function runTests() {
  const testCases = [
    {
      name: "a student whose onboarding is not done yet (null) is offered it",
      run: () => needsOnboarding(student({ onboardingCompletedAt: null })) === true,
    },
    {
      name: "a student who finished or set it aside is not",
      run: () => needsOnboarding(student({ onboardingCompletedAt: "2026-10-28T10:00:00.000Z" })) === false,
    },
    {
      name: "a profile without the field (API not updated yet) gets nothing",
      run: () => needsOnboarding(student({ id: "s1" })) === false,
    },
    {
      name: "instructors, admins, a missing profile or no user never see it",
      run: () =>
        needsOnboarding({ role: "INSTRUCTOR", studentProfile: { onboardingCompletedAt: null } }) === false &&
        needsOnboarding({ role: "ADMIN" }) === false &&
        needsOnboarding({ role: "STUDENT", studentProfile: null }) === false &&
        needsOnboarding(null) === false,
    },
    {
      name: "courses order like My Courses: last opened first, then newest enrollment",
      run: () => {
        const list = [
          { courseId: "old", enrolledAt: "2026-01-01" },
          { courseId: "opened", enrolledAt: "2025-01-01", lastAccessedAt: "2026-10-01" },
          { courseId: "new", enrolledAt: "2026-09-01" },
        ];
        const order = sortByRecentAccess(list).map(courseIdOf);
        return order.join(",") === "opened,new,old" && list[0].courseId === "old";
      },
    },
    {
      name: "course id comes from courseId or the nested course",
      run: () => courseIdOf({ course: { id: "c9" } }) === "c9" && courseIdOf({ courseId: "c1" }) === "c1" && courseIdOf(undefined) === null,
    },
    {
      name: "resolveTourCourseId prioritizes current learn page course over enrollment list",
      run: () => {
        // Course ids are cuids; the learn URL may carry one (an older link).
        const active = "cactivecourse00000000001";
        const enrollments = [{ courseId: "c-recent" }, { courseId: "c-old" }];
        const onCourse = resolveTourCourseId(`/student/learn/${active}`, enrollments);
        const onOtherPage = resolveTourCourseId("/student/my-courses", enrollments);
        const onSubmissions = resolveTourCourseId("/student/assignments", enrollments);
        return onCourse === active && onOtherPage === "c-recent" && onSubmissions === "c-recent";
      },
    },
    {
      name: "TOUR_CHECKLIST items match the anchored steps in TOUR_STEPS exactly",
      run: () => {
        const anchored = TOUR_STEPS.filter((s) => !s.center);
        if (anchored.length !== TOUR_CHECKLIST.length) return false;
        return anchored.every((step, i) => step.seen === TOUR_CHECKLIST[i].key);
      },
    },
    {
      name: "TOUR_STEPS has safe flag on completion and proper route designations",
      run: () => {
        const comp = TOUR_STEPS.find((s) => s.key === "complete");
        const subs = TOUR_STEPS.find((s) => s.key === "subs");
        return comp?.safe === true && comp?.route === "learn" && subs?.route === "submissions";
      },
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

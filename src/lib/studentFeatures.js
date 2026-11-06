/**
 * Which student features a student gets, from their enrolments.
 *
 * The SSC Class 10 Test Series is a board-paper practice course: it has no
 * assignments to submit and issues no certificate. A student whose every
 * enrolment is such a course therefore gets no Submissions and no
 * Certificates anywhere in the app. Enrolled in any other course as well,
 * they get both as usual.
 *
 * Courses are matched by category (GET /enrollments sends course.category).
 */
export const BOARD_PAPER_CATEGORY = "SSC Class 10";

const categoryOf = (enrollment) => (enrollment?.course?.category || "").trim().toLowerCase();

/** True when the student has enrolments and all of them are SSC Class 10 courses. */
export function isBoardPaperOnlyStudent(enrollments) {
  if (!Array.isArray(enrollments) || enrollments.length === 0) return false;
  const target = BOARD_PAPER_CATEGORY.toLowerCase();
  return enrollments.every((enrollment) => categoryOf(enrollment) === target);
}

import { normalizeAssignmentStatus } from "@/features/student/constants/assignmentsConfig";

/**
 * The student Submissions page merges two sources — assignment items
 * (GET /assignments) and attempted quizzes (GET /quizzes/my-submissions) —
 * into one record shape, so a single list, filter set and sort can treat
 * both alike.
 */

// Assignments and quizzes are always shown as separate tabs — no mixed "All" view.
export const SUBMISSION_TYPES = [
  { key: "assignment", label: "Assignments" },
  { key: "quiz", label: "Quizzes" },
];

export const SUBMISSION_STATUS_FILTERS = [
  { key: "all", label: "All status" },
  // Anything handed in, whatever became of it.
  { key: "submitted", label: "Submitted" },
  { key: "passed", label: "Passed" },
  { key: "failed", label: "Failed" },
  { key: "graded", label: "Graded" },
  { key: "pending", label: "Pending review" },
];

// Quizzes-tab-only filter — quizTag on the Quiz model, not a submission
// property, so it's a separate list from SUBMISSION_STATUS_FILTERS.
const QUIZ_TAG_TO_FILTER = { SELF_TEST: "self", FINAL: "final", QUALIFYING: "qualifying" };

export const SUBMISSION_QUIZ_TYPE_FILTERS = [
  { key: "all", label: "All quiz types" },
  { key: "self", label: "Self-Test" },
  { key: "final", label: "Final Quiz" },
  // A qualifying test is a real attempt with a real result, so it belongs in
  // the student's submissions — but it is neither practice nor the formal
  // assessment, and the old two-way mapping filed it under "Final Quiz".
  { key: "qualifying", label: "Qualifying Test" },
];

export const SUBMISSION_SORTS = [
  { key: "newest", label: "Newest first" },
  { key: "oldest", label: "Oldest first" },
  { key: "highest", label: "Highest score" },
  { key: "lowest", label: "Lowest score" },
];

export const SUBMISSION_STATUS_LABELS = {
  passed: "Passed",
  failed: "Failed",
  submitted: "Submitted",
  graded: "Graded",
  pending: "Pending review",
  in_progress: "In progress",
  todo: "Not submitted",
  overdue: "Overdue",
};

export const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
    : "—";

export const formatTime = (value) =>
  value ? new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : null;

/** 45s · 4m 07s · 1h 03m — null when the duration wasn't recorded. */
export function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

/**
 * An assignment grade is free text. Only a grade that states its own scale
 * ("18/20", "90%"), or a bare number against the assignment's marks, becomes
 * a score; anything else ("A+", "Excellent") stays text with no percentage.
 */
export function parseAssignmentGrade(grade, marks) {
  if (!grade) return null;
  const text = String(grade).trim();

  const ratio = text.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (ratio && Number(ratio[2]) > 0) {
    return { text, percentage: Math.round((Number(ratio[1]) / Number(ratio[2])) * 100) };
  }

  const percent = text.match(/^(\d+(?:\.\d+)?)\s*%$/);
  if (percent) return { text, percentage: Math.round(Number(percent[1])) };

  if (/^\d+(?:\.\d+)?$/.test(text) && Number(marks) > 0) {
    return { text: `${text}/${marks}`, percentage: Math.round((Number(text) / Number(marks)) * 100) };
  }

  return { text, percentage: null };
}

// Result and attempt pages send the student back here when they're done.
const FROM_SUBMISSIONS = `from=${encodeURIComponent("/student/assignments")}`;

// Exported so the standalone assignment detail page can derive the exact
// same status/grade shape the Submissions list uses, instead of
// re-deriving it (and drifting from parseAssignmentGrade's rules over time).
export function assignmentRecord(a) {
  const raw = normalizeAssignmentStatus(a);
  const submitted = raw === "Submitted" || raw === "Graded";
  const overdue = !submitted && Boolean(a.dueDate) && new Date(a.dueDate) < new Date();

  let status = "todo";
  if (raw === "Graded") status = "graded";
  else if (raw === "Submitted") status = "pending";
  else if (raw === "In Progress") status = "in_progress";
  else if (overdue) status = "overdue";

  const grade = raw === "Graded" ? parseAssignmentGrade(a.grade, a.marks) : null;

  return {
    key: `${a.kind || "assignment"}:${a.id}`,
    type: "assignment",
    id: a.id,
    title: a.title || "Assignment",
    courseTitle: a.course?.title || a.courseTitle || null,
    moduleTitle: a.moduleTitle || null,
    status,
    submitted,
    submittedAt: a.submittedAt || null,
    dueDate: a.dueDate || null,
    sortDate: a.submittedAt || a.createdAt || null,
    percentage: grade?.percentage ?? null,
    grade,
    feedback: a.feedback || null,
    // A lesson-composer Assignment (kind "content") has no Assignment row
    // behind it — its own result/brief page reads it via /contents/:id
    // instead of /assignments/:id — but otherwise behaves identically:
    // a result view once submitted, the brief + upload form until then.
    href:
      a.kind === "content"
        ? `/student/content-assignments/${a.id}`
        : `/student/assignments/${a.id}`,
    actionLabel: submitted ? "View Submission" : "Open Assignment",
  };
}

function quizRecord(q) {
  const latest = q.latestAttempt;
  // A quiz with no marks to earn has no score and no pass/fail.
  const graded = Number(latest?.totalMarks) > 0;

  return {
    key: `quiz:${q.id}`,
    type: "quiz",
    id: q.id,
    title: q.title || "Quiz",
    courseTitle: q.course?.title || null,
    moduleTitle: q.moduleTitle || null,
    quizType: QUIZ_TAG_TO_FILTER[q.quizTag] || "final",
    status: !graded ? "submitted" : latest.passed ? "passed" : "failed",
    submitted: true,
    submittedAt: latest?.submittedAt || null,
    sortDate: latest?.submittedAt || null,
    percentage: graded ? latest.percentage : null,
    score: graded ? { value: latest.score, max: latest.totalMarks } : null,
    attemptsUsed: q.attemptsUsed,
    maxAttempts: q.maxAttempts,
    unlimitedAttempts: q.unlimitedAttempts,
    canRetake: Boolean(q.canAttempt),
    href: `/student/result/${q.id}?${FROM_SUBMISSIONS}`,
    retakeHref: `/student/attempt/${q.id}?${FROM_SUBMISSIONS}`,
    actionLabel: "View Result",
  };
}

export function buildSubmissionRecords(assignments = [], quizzes = []) {
  // Quiz records are always submitted (they come from an attempts endpoint —
  // there's no "not yet attempted" quiz row to begin with); assignments come
  // from a plain "every assignment in your courses" list, so it's the one
  // side that needs filtering down to match — this is a Submissions list,
  // not an assignment browser.
  const submittedAssignments = assignments.map(assignmentRecord).filter((r) => r.submitted);
  return [...submittedAssignments, ...quizzes.map(quizRecord)];
}

const STATUS_MATCHERS = {
  all: () => true,
  submitted: (r) => r.submitted,
  passed: (r) => r.status === "passed",
  failed: (r) => r.status === "failed",
  graded: (r) => r.status === "graded" || r.status === "passed" || r.status === "failed",
  pending: (r) => r.status === "pending",
  todo: (r) => !r.submitted,
};

const toTime = (value) => (value ? new Date(value).getTime() : null);

// Undated records sink to the bottom whichever direction is chosen.
const byDate = (direction) => (a, b) => {
  const at = toTime(a.sortDate);
  const bt = toTime(b.sortDate);
  if (at === bt) return 0;
  if (at === null) return 1;
  if (bt === null) return -1;
  return direction * (at - bt);
};

// Unscored records sink too; ties fall back to newest first.
const byScore = (direction) => (a, b) => {
  if (a.percentage === b.percentage) return byDate(-1)(a, b);
  if (a.percentage === null) return 1;
  if (b.percentage === null) return -1;
  return direction * (a.percentage - b.percentage);
};

const COMPARATORS = {
  newest: byDate(-1),
  oldest: byDate(1),
  highest: byScore(-1),
  lowest: byScore(1),
};

export function filterAndSortSubmissions(
  records,
  { type = "assignment", status = "all", quizType = "all", query = "", sort = "newest" }
) {
  const needle = query.trim().toLowerCase();
  const matchesStatus = STATUS_MATCHERS[status] || STATUS_MATCHERS.all;

  return records
    .filter(
      (r) =>
        r.type === type &&
        matchesStatus(r) &&
        // Only quiz records carry quizType, so this is a no-op on the Assignments tab.
        (quizType === "all" || r.quizType === quizType) &&
        (!needle ||
          r.title.toLowerCase().includes(needle) ||
          (r.courseTitle || "").toLowerCase().includes(needle) ||
          (r.moduleTitle || "").toLowerCase().includes(needle))
    )
    .sort(COMPARATORS[sort] || COMPARATORS.newest);
}

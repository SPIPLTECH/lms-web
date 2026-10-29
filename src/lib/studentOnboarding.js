/**
 * First-run onboarding for students (welcome banner, Getting started and the
 * guided tour of the learning page).
 *
 * Who sees it is the server's answer: StudentProfile.onboardingCompletedAt
 * from GET /auth/profile. NULL = a student who registered after the feature
 * shipped and has not finished or set it aside yet. Every student that
 * existed before has a date (scripts/add-student-onboarding.sql), and a
 * profile without the field at all (the API not updated yet) gets nothing —
 * so an old account is never greeted as new.
 */
import { learnKeyFromPath, resolveCourseKey } from "./courseSlug.js";

export function needsOnboarding(user) {
  if (!user || user.role !== "STUDENT") return false;
  if (typeof window !== "undefined") {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("onboarding") === "true" || params.get("onboarding") === "1") {
        return true;
      }
    } catch {
      // ignore
    }
  }
  const profile = user.studentProfile;
  return Boolean(profile) && profile.onboardingCompletedAt === null;
}

/**
 * Enrollments in the order My Courses lists them: most recently opened
 * first, never-opened ones by enrollment date. The first one is the course
 * "Continue Learning" and the tour both open.
 */
export function sortByRecentAccess(enrollments = []) {
  return [...enrollments].sort((a, b) => {
    const timeA = a.lastAccessedAt ? new Date(a.lastAccessedAt).getTime() : 0;
    const timeB = b.lastAccessedAt ? new Date(b.lastAccessedAt).getTime() : 0;
    if (timeA !== timeB) return timeB - timeA;

    const enrollA = a.enrolledAt ? new Date(a.enrolledAt).getTime() : 0;
    const enrollB = b.enrolledAt ? new Date(b.enrolledAt).getTime() : 0;
    return enrollB - enrollA;
  });
}

export const courseIdOf = (enrollment) => enrollment?.courseId || enrollment?.course?.id || null;

/**
 * Resolves the course ID to use for the tour:
 * If the student is already inside a course learning page, tours that course.
 * Otherwise, picks their most recent enrollment (same as Continue Learning).
 */
export function resolveTourCourseId(pathname, enrollments = []) {
  // The learn page's segment is the course's readable key or, in an older
  // link, its id (lib/courseSlug.js).
  const key = learnKeyFromPath(pathname);
  if (key) return resolveCourseKey(key, enrollments) || key;
  return courseIdOf(sortByRecentAccess(enrollments)[0]);
}

export const TOUR_STEPS = [
  { key: "hello", center: true },
  {
    key: "map", seen: "map", route: "learn", target: "course-map", act: "mapOpened",
    title: "Your Course Map",
    body: "The whole course in order: modules, lessons, topics, subtopics and concepts. Green ticks are done; the highlighted row is where you are.",
  },
  {
    key: "locks", seen: "locks", route: "learn", target: "locked-item", act: "lockTapped",
    title: "Steps open in order",
    body: "A lock means something earlier isn't finished yet. Tap a locked item and the app tells you exactly what to finish first.",
  },
  {
    key: "complete", seen: "complete", route: "learn", target: "complete", safe: true,
    title: "How an item gets done",
    body: "Mark as Complete finishes reading and documents. Videos also finish when they play to the end; a Self-Test counts once you attempt it, a Final quiz once you pass.",
  },
  {
    key: "nav", seen: "nav", route: "learn", target: "lesson-nav", act: "nextTapped",
    title: "Previous and Next",
    body: "Walk the course one step at a time. Next never skips ahead: if the next step is locked, it tells you what to finish first.",
  },
  {
    key: "more", seen: "more", route: "learn", target: "more", act: "moreOpened",
    title: "More: Ask instructor and Sticky notes",
    body: "Send your instructor a question about the item on screen, or keep your own sticky notes for this lesson.",
  },
  {
    key: "ai", seen: "ai", route: "learn", target: "ask-ai",
    title: "Ask AI",
    body: "Ask AI explains what you're studying, with examples, and knows which course and lesson you're on. It steps aside while you attempt a quiz.",
  },
  {
    key: "subs", seen: "subs", route: "submissions", target: "submissions",
    title: "Submissions",
    body: "Every quiz and assignment you submit lands here: scores, attempts and instructor feedback. Learning brings you back to your courses.",
  },
  { key: "finish", center: true },
];

export const TOUR_CHECKLIST = [
  { key: "map", label: "Explore the Course Map", desc: "Every module and lesson, in order" },
  { key: "locks", label: "See how steps unlock", desc: "Why some items show a lock" },
  { key: "complete", label: "Complete lessons & quizzes", desc: "Mark as Complete and quiz rules" },
  { key: "nav", label: "Use Previous and Next", desc: "Move through the course" },
  { key: "more", label: "Find More tools", desc: "Ask instructor, Sticky notes" },
  { key: "ai", label: "Meet Ask AI", desc: "Help with what you're studying" },
  { key: "subs", label: "Find your Submissions", desc: "Scores, attempts and feedback" },
];

// Getting started ticks are a convenience on this browser only (which parts
// of the tour were seen); whether onboarding is done lives on the server.
const seenKey = (userId) => `student_tour_seen:${userId}`;

export function readSeenSteps(userId) {
  if (!userId || typeof window === "undefined" || !window.localStorage) return {};
  try {
    return JSON.parse(window.localStorage.getItem(seenKey(userId))) || {};
  } catch {
    return {};
  }
}

export function writeSeenSteps(userId, seen) {
  if (!userId || typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(seenKey(userId), JSON.stringify(seen));
  } catch {
    // Storage blocked: the ticks just don't persist.
  }
}

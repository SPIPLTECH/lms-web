/**
 * Readable course keys for student URLs: /student/learn/cdac-c-cat-course-section-a
 * instead of /student/learn/<course id>.
 *
 * Built from the course title, so nothing new is stored. The key is resolved
 * back to the course id against the student's own enrollments — the only
 * courses a student can open — and a course id still works in its place, so
 * every older link and every caller that only knows the id keeps working.
 */

/** "CDAC C-CAT Course - Section A" -> "cdac-c-cat-course-section-a". */
export function slugifyTitle(title) {
  return String(title || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

const enrollmentCourse = (enrollment) => ({
  id: enrollment?.courseId || enrollment?.course?.id || null,
  title: enrollment?.course?.title || null,
});

/**
 * The URL key for `course` ({ id, title }). Two of the student's courses with
 * the same title would share a key, so a duplicate gets the end of its id
 * appended; with no title the id itself is used.
 */
export function courseKeyFor(course, enrollments = []) {
  const id = course?.id || null;
  const base = slugifyTitle(course?.title);
  if (!base) return id;
  const shared = enrollments
    .map(enrollmentCourse)
    .some((other) => other.id && other.id !== id && slugifyTitle(other.title) === base);
  return shared && id ? `${base}-${id.slice(-6)}` : base;
}

/** The course id `key` names among `enrollments` (a key or an id), or null. */
export function resolveCourseKey(key, enrollments = []) {
  if (!key) return null;
  const courses = enrollments.map(enrollmentCourse).filter((course) => course.id);
  const byId = courses.find((course) => course.id === key);
  if (byId) return byId.id;
  const byKey = courses.find((course) => courseKeyFor(course, enrollments) === key);
  return byKey ? byKey.id : null;
}

/**
 * Whether `key` is shaped like a course id (a cuid) rather than a readable
 * key: readable keys of more than one word always contain a hyphen. Lets the
 * learn page start loading an id link without waiting for the enrollment list.
 */
export function looksLikeCourseId(key) {
  return typeof key === "string" && /^c[a-z0-9]{20,}$/.test(key);
}

/** /student/learn/<readable key>[?query] for a course the student is enrolled in. */
export function learnHref(course, enrollments = [], query = "") {
  const key = courseKeyFor(course, enrollments) || course?.id || "";
  const search = query ? (query.startsWith("?") ? query : `?${query}`) : "";
  return `/student/learn/${encodeURIComponent(key)}${search}`;
}

/** learnHref for a course known only by id (its title is looked up in `enrollments`). */
export function learnHrefForId(courseId, enrollments = [], query = "") {
  const match = enrollments.map(enrollmentCourse).find((course) => course.id === courseId);
  return learnHref({ id: courseId, title: match?.title }, enrollments, query);
}

const LEARN_PREFIX = "/student/learn/";

/** The course key in a /student/learn/<key> pathname, or null. */
export function learnKeyFromPath(pathname) {
  if (typeof pathname !== "string" || !pathname.startsWith(LEARN_PREFIX)) return null;
  const segment = pathname.slice(LEARN_PREFIX.length).split(/[/?#]/)[0];
  if (!segment) return null;
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/** Whether `pathname` is the learn page of `courseId`, by readable key or by id. */
export function isLearnPathFor(pathname, courseId, enrollments = []) {
  const key = learnKeyFromPath(pathname);
  if (!key || !courseId) return false;
  return key === courseId || resolveCourseKey(key, enrollments) === courseId;
}

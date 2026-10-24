
function daysAgoLabel(date) {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Merges enrollments and certificate issuances into a single recency-sorted
 * timeline for the "Recent Activity" feed. Only sources the admin can
 * genuinely see platform-wide are included here — e.g. quiz completions are
 * left out because that endpoint is instructor-scoped, not admin-wide.
 */
export function deriveRecentActivity(enrollments, certificates) {
  const enrollmentEvents = (enrollments ?? []).map((e, idx) => ({
    id: `enrollment-${e.id ?? idx}`,
    type: "enrollment",
    title: `${e.student?.user?.name ?? "A student"} enrolled in ${e.course?.title ?? "a course"}`,
    at: e.enrolledAt ? new Date(e.enrolledAt) : null,
  }));

  const certificateEvents = (certificates ?? []).map((c, idx) => ({
    id: `certificate-${c.id ?? idx}`,
    type: "certificate",
    title: `Certificate issued to ${c.student?.user?.name ?? "a student"} for ${c.course?.title ?? "a course"}`,
    at: c.issuedAt ? new Date(c.issuedAt) : null,
  }));

  return [...enrollmentEvents, ...certificateEvents]
    .filter((event) => event.at)
    .sort((a, b) => b.at - a.at)
    .slice(0, 8)
    .map((event) => ({ ...event, time: daysAgoLabel(event.at) }));
}

/* --------------------------- Admin review queue --------------------------- */

/**
 * Everything on the platform that is waiting on an admin decision, ordered by
 * urgency. Derived entirely from the course list the admin already fetches
 * (GET /courses returns `store`, `status` and `_count` for an ADMIN caller),
 * so this costs no extra request.
 *
 * The three checks map onto the admin's actual remit — an instructor cannot
 * publish a course or set a price, so these can only be cleared here:
 *
 *   1. PUBLISHED but not purchasable. A course is buyable only when a Store
 *      row exists AND price > 0 AND isFree is false. A published course that
 *      fails that is visible to students and impossible to buy, which is the
 *      most expensive state on the platform and invisible on every other
 *      screen.
 *   2. PUBLISHED with no modules — live, and empty.
 *   3. DRAFT awaiting review — the ordinary approval queue.
 */
const isPublished = (c) => c.status === "PUBLISHED" || c.status === "Published";
const isDraft = (c) => c.status === "DRAFT" || c.status === "Draft";

/** Mirrors the purchasability rule the student Store and checkout enforce. */
function isPurchasable(course) {
  const store = course?.store;
  if (!store) return false;
  if (store.isFree) return true;
  return Number(store.price) > 0;
}

export function deriveAdminReviewQueue(courses = []) {
  const list = Array.isArray(courses) ? courses : [];

  const unpriced = list.filter((c) => isPublished(c) && !isPurchasable(c));
  const empty = list.filter((c) => isPublished(c) && (c._count?.modules ?? 0) === 0);
  const drafts = list.filter(isDraft);

  const items = [
    {
      id: "adm-unpriced",
      label: `${unpriced.length} published ${unpriced.length === 1 ? "course has" : "courses have"} no valid price`,
      detail: "Visible to students but impossible to buy",
      count: unpriced.length,
      severity: "high",
      href: "/admin/courses?status=PUBLISHED",
      courses: unpriced.slice(0, 3),
    },
    {
      id: "adm-empty",
      label: `${empty.length} published ${empty.length === 1 ? "course has" : "courses have"} no content`,
      detail: "Published with zero modules",
      count: empty.length,
      severity: "high",
      href: "/admin/courses?status=PUBLISHED",
      courses: empty.slice(0, 3),
    },
    {
      id: "adm-drafts",
      label: `${drafts.length} draft ${drafts.length === 1 ? "course" : "courses"} awaiting review`,
      detail: "Submitted by instructors, not yet published",
      count: drafts.length,
      severity: "medium",
      href: "/admin/courses?status=DRAFT",
      courses: drafts.slice(0, 3),
    },
  ];

  const rank = { high: 0, medium: 1, low: 2 };
  return items.filter((i) => i.count > 0).sort((a, b) => rank[a.severity] - rank[b.severity]);
}

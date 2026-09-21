/**
 * Groups a flat, ordered list of Lesson/Topic Content rows into render items
 * for the student content viewer.
 *
 * Imported courses store each markdown block (heading, paragraph, table, ...)
 * as its own `type: "HTML"` Content row, so a single written lecture can be
 * dozens of consecutive rows. Rendered one-per-card that's unreadable, so
 * consecutive HTML rows are merged here into one synthetic document item —
 * their existing `htmlContent` strings are concatenated as-is (nothing is
 * parsed, rewritten, or invented). Every other content type (VIDEO, FILE,
 * EXTERNAL, ...) passes through unchanged, in its original position.
 *
 * The merged item keeps the `id` of its first block, so callers that persist
 * a contentId (state sync, bookmarks) keep referencing a real Content row.
 * It only carries a `title` if one of its blocks actually had one.
 *
 * Every item (merged or not) also carries `contentIds`: the full list of
 * underlying Content row ids it represents. A "content visited" signal fired
 * against the displayed item must mark ALL of those ids visited, not just
 * the representative `id` — otherwise the blocks merged away here could
 * never be counted toward lesson completion.
 */
function isHtmlImage(item) {
  if (!item) return false;
  const type = item.type?.toUpperCase();
  if (type === "IMAGE") return true;
  if (type === "HTML" && item.htmlContent) {
    return (
      item.htmlContent.includes("cc-image-block") ||
      /<figure[^>]*class="[^"]*cc-image-block[^"]*"/i.test(item.htmlContent) ||
      /<img\s+/i.test(item.htmlContent)
    );
  }
  return false;
}

// A Content row hangs off exactly one of these. Two rows only belong in the
// same merged document when they share that parent. Comparing topicId alone
// is not enough: SubTopic and Concept rows all have a null topicId, so rows
// from two different SubTopics (or a SubTopic and a Concept) would look alike.
const PARENT_ID_FIELDS = ["courseId", "moduleId", "lessonId", "topicId", "subTopicId", "conceptId"];

function hasSameParent(a, b) {
  return PARENT_ID_FIELDS.every((field) => (a?.[field] ?? null) === (b?.[field] ?? null));
}

export function groupLessonContentForDocumentView(contents) {
  const items = Array.isArray(contents) ? contents : [];
  const grouped = [];

  for (const item of items) {
    const last = grouped[grouped.length - 1];
    const hasOwnTitle = Boolean(item?.title && item.title.trim());

    if (
      !hasOwnTitle &&
      item?.type === "HTML" &&
      !isHtmlImage(item) &&
      last?.type === "HTML" &&
      !isHtmlImage(last) &&
      last.__merged &&
      hasSameParent(last, item)
    ) {
      last.htmlContent = [last.htmlContent, item.htmlContent].filter(Boolean).join("\n");
      if (item.id) last.contentIds.push(item.id);
      continue;
    }

    grouped.push(
      item?.type === "HTML" && !isHtmlImage(item)
        ? { ...item, __merged: true, contentIds: item?.id ? [item.id] : [] }
        : { ...item, contentIds: item?.id ? [item.id] : [] }
    );
  }

  return grouped;
}

/**
 * Presentation-only helpers for the AI Assistant. No network, no LLM.
 */

const DEFAULT_TITLE = "New conversation";

/** Groups conversations into Today / Earlier, preserving server ordering. */
export function groupByRecency(conversations = []) {
  const now = new Date();
  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const today = [];
  const earlier = [];
  for (const c of conversations) {
    const at = new Date(c.lastMessageAt || c.createdAt);
    (sameDay(at, now) ? today : earlier).push(c);
  }
  return { today, earlier };
}

export function displayTitle(conversation) {
  if (!conversation) return DEFAULT_TITLE;
  const t = (conversation.title || "").trim();
  if (!t) return DEFAULT_TITLE;
  return t.length > 44 ? `${t.slice(0, 44).trim()}…` : t;
}

/**
 * Starter prompts tailored to the student's active context.
 *
 * If inside a course and viewing an item (video, PDF, reading), starters prompt
 * directly about that item or course. Outside a course, starters focus on enrolled
 * courses and study planning.
 */
export function suggestionsFor(scope, courseTitle, contentTitle, contentType) {
  if (courseTitle) {
    const itemLabel = contentTitle
      ? `"${contentTitle}"`
      : contentType === "VIDEO"
      ? "this video"
      : contentType === "DOCUMENT" || contentType === "PDF"
      ? "this document"
      : "the current topic";

    return [
      `Give me a summary of ${itemLabel}`,
      `Explain the key concepts in ${courseTitle}`,
      `What are the most important takeaways from this lesson?`,
    ];
  }

  return [
    "What concepts should I review today in my courses?",
    "Summarise my enrolled courses and progress",
    "Explain key concepts from my recent lessons",
    "Give me study tips for my current courses",
  ];
}

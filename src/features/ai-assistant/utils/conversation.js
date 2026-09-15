/**
 * Presentation-only helpers for the AI Assistant. No network, no LLM.
 */

export const DEFAULT_TITLE = "New conversation";

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
 * Starter prompts per scope.
 *
 * The guest and browsing sets stay at course level on purpose — offering
 * "explain lesson 3" to someone who cannot receive lesson content would
 * advertise a refusal. The enrolled set is deliberately free of anything that
 * reads as "help me answer the quiz".
 */
export const SUGGESTIONS = {
  GUEST: [
    "What courses are available on Orange Tree?",
    "What can I learn on this platform?",
    "How does learning on Orange Tree work?",
    "Can you recommend a course for beginners?",
  ],
  BROWSING: [
    "What courses are recommended for me?",
    "What topics are covered in the catalog?",
    "What should I learn next?",
    "How do I choose the right course?",
  ],
  ENROLLED: [
    "Explain concepts from my enrolled courses",
    "Give me a real-world example",
    "Summarise key concepts in my course material",
    "How does this relate to what I learned earlier?",
  ],
};

export function suggestionsFor(scope) {
  return SUGGESTIONS[scope] || SUGGESTIONS.GUEST;
}

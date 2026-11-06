// Board-paper question types (SSC Class 10 Test Series). The learning-sequence
// tree carries each SubTopic's `questionType` ({ type, marks }), read on the
// server from SubTopic.description (lms-api utils/questionTypes.js); it is null
// in every other course, so none of this shows anywhere else.

// Display order of the type tags.
export const QUESTION_TYPE_ORDER = [
  "MCQs",
  "Short answer",
  "Descriptive",
  "Activity",
  "Diagrams & graphs",
  "Scientific reasons",
  "Proofs",
];

/** A Topic node's SubTopic nodes that carry a question type, in course order. */
export function typedSubTopics(topic) {
  if (!topic || topic.kind !== "TOPIC") return [];
  return (topic.entries || [])
    .filter((entry) => entry.type === "container" && entry.node?.questionType)
    .map((entry) => entry.node);
}

/**
 * A textbook practice question (the extra questions from the Balbharati
 * exercises, loaded as "Practice 1", "Practice 2", "Practice MCQ's" after a
 * topic's board questions) rather than one asked in the board.
 */
export function isTextbookPractice(node) {
  return /^Practice\b/.test(node?.title || "");
}

/**
 * The SubTopics of one type in the order the picker lists them — board
 * questions first, then textbook practice — each with its label: "Question n"
 * or "Practice n", counted separately within the type ("MCQ's" / "Practice
 * MCQ's" keep their names).
 * @returns {Array<{ node: object, label: string, practice: boolean }>}
 */
export function labelledOfType(nodes) {
  const board = nodes.filter((node) => !isTextbookPractice(node));
  const practice = nodes.filter((node) => isTextbookPractice(node));
  const label = (node, index, word) =>
    node.questionType?.type === "MCQs" ? node.title : `${word} ${index + 1}`;
  return [
    ...board.map((node, index) => ({ node, label: label(node, index, "Question"), practice: false })),
    ...practice.map((node, index) => ({ node, label: label(node, index, "Practice"), practice: true })),
  ];
}

/** Whether clicking this Topic opens the question-type picker. */
export function hasQuestionTypes(topic) {
  return typedSubTopics(topic).length > 0;
}

/** [{ type, count }] of a Topic's SubTopics, in QUESTION_TYPE_ORDER. */
export function questionTypeCounts(topic) {
  const counts = new Map();
  for (const node of typedSubTopics(topic)) {
    const { type } = node.questionType;
    counts.set(type, (counts.get(type) || 0) + 1);
  }
  return QUESTION_TYPE_ORDER.filter((type) => counts.has(type)).map((type) => ({ type, count: counts.get(type) }));
}

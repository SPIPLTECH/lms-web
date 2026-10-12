import { bySequenceOrder, sequenceMemberId, moveWithinSequence, sequenceOrders } from "../reorderSiblings.js";

/**
 * Move Up/Down in the Course Map works on a parent's ONE learning sequence:
 * its Content rows (ordinary content, and the Content rows placing quizzes and
 * assignments) interleaved with its child containers by the shared `order`.
 * A move swaps an item with its neighbour in that mixed list — never with the
 * next item of its own type — and sends the parent's complete new order.
 *
 * Rows are shaped the way ParentContentRows builds them: a Content-backed row
 * carries `contentId` (for a quiz/assignment `id` is the Quiz/Assignment id),
 * a child container is just its own row.
 */

let passed = 0;
let failed = 0;

function check(name, actual, expected) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    console.log(`[PASS] ${name}`);
    passed++;
  } else {
    console.error(`[FAIL] ${name}`);
    console.error("  Expected:", expected);
    console.error("  Actual:  ", actual);
    failed++;
  }
}

const content = (title, order, type = "VIDEO") => ({ id: `c-${title}`, contentId: `c-${title}`, kind: "content", type, title, order });
const quiz = (title, order) => ({ id: `q-${title}`, contentId: `cq-${title}`, kind: "quiz", title, order });
const assignment = (title, order) => ({ id: `a-${title}`, contentId: `ca-${title}`, kind: "assignment", title, order });
const container = (kind, title, order) => ({ id: `${kind}-${title}`, kind, title, order });

/** The parent's sequence as ParentContentRows draws it, plus a title lookup for readable assertions. */
function sequenceOf(rows) {
  const sorted = [...rows].sort(bySequenceOrder);
  const titleOf = new Map(sorted.map((row) => [sequenceMemberId(row), row.title]));
  return { ids: sorted.map(sequenceMemberId), titles: (ids) => (ids ? ids.map((id) => titleOf.get(id)) : ids) };
}

/** Moves the row titled `title` and returns the resulting titles (or null when the move is not possible). */
function move(rows, title, direction) {
  const seq = sequenceOf(rows);
  const row = rows.find((candidate) => candidate.title === title);
  return seq.titles(moveWithinSequence(seq.ids, sequenceMemberId(row), direction));
}

// The lesson from the bug recording (Lesson "Getting Started", 0:12).
const recordedLesson = () => [
  container("topic", "Data Types", 1),
  container("topic", "Variables", 2),
  assignment("Sample Assignment", 3),
  quiz("Java Basics", 4),
  content("Image", 5, "IMAGE"),
  container("topic", "Sample Topic", 6),
  content("Hello Java", 7, "VIDEO"),
];

// --- 1-3. Topic <-> Image / Video, Content <-> Topic both ways ---------------
check(
  "Topic Move Up swaps with the Image directly above it, not with the previous Topic",
  move(recordedLesson(), "Sample Topic", "up"),
  ["Data Types", "Variables", "Sample Assignment", "Java Basics", "Sample Topic", "Image", "Hello Java"]
);
check(
  "Topic Move Down swaps with the Video directly below it",
  move(recordedLesson(), "Sample Topic", "down"),
  ["Data Types", "Variables", "Sample Assignment", "Java Basics", "Image", "Hello Java", "Sample Topic"]
);
check(
  "Image Move Down crosses the Topic below it",
  move(recordedLesson(), "Image", "down"),
  ["Data Types", "Variables", "Sample Assignment", "Java Basics", "Sample Topic", "Image", "Hello Java"]
);
check(
  "Video Move Up crosses the Topic above it",
  move(recordedLesson(), "Hello Java", "up"),
  ["Data Types", "Variables", "Sample Assignment", "Java Basics", "Image", "Hello Java", "Sample Topic"]
);
check(
  "Topic Move Up next to another Topic still swaps just those two",
  move(recordedLesson(), "Variables", "up"),
  ["Variables", "Data Types", "Sample Assignment", "Java Basics", "Image", "Sample Topic", "Hello Java"]
);

// --- 4-7. Every container level against its parent's own Content -------------
const courseLevel = () => [content("Welcome", 1), container("module", "M1", 2), content("Course map", 3, "IMAGE"), container("module", "M2", 4)];
check("Module Move Down crosses Course-level Content", move(courseLevel(), "M1", "down"), ["Welcome", "Course map", "M1", "M2"]);
check("Module Move Up crosses Course-level Content", move(courseLevel(), "M1", "up"), ["M1", "Welcome", "Course map", "M2"]);

const moduleLevel = () => [container("lesson", "L1", 1), content("Module intro", 2, "PDF"), container("lesson", "L2", 3)];
check("Lesson Move Down crosses Module-level Content", move(moduleLevel(), "L1", "down"), ["Module intro", "L1", "L2"]);
check("Lesson Move Up crosses Module-level Content", move(moduleLevel(), "L2", "up"), ["L1", "L2", "Module intro"]);

const topicLevel = () => [content("Topic text", 1, "TEXT"), container("subTopic", "S1", 2), content("Diagram", 3, "IMAGE")];
check("SubTopic Move Up crosses Topic-level Content", move(topicLevel(), "S1", "up"), ["S1", "Topic text", "Diagram"]);
check("SubTopic Move Down crosses Topic-level Content", move(topicLevel(), "S1", "down"), ["Topic text", "Diagram", "S1"]);

const subTopicLevel = () => [container("concept", "C1", 1), content("SubTopic video", 2), container("concept", "C2", 3)];
check("Concept Move Down crosses SubTopic-level Content", move(subTopicLevel(), "C1", "down"), ["SubTopic video", "C1", "C2"]);
check("Concept Move Up crosses SubTopic-level Content", move(subTopicLevel(), "C2", "up"), ["C1", "C2", "SubTopic video"]);

const conceptLevel = () => [content("Video", 1), content("PDF", 2, "PDF"), content("Text", 3, "TEXT")];
check("Content inside a Concept moves among that Concept's Content", move(conceptLevel(), "PDF", "up"), ["PDF", "Video", "Text"]);

// --- 8-9. Placed Quiz and Assignment against adjacent Content -----------------
check(
  "Placed Quiz Move Up crosses the Assignment above it",
  move(recordedLesson(), "Java Basics", "up"),
  ["Data Types", "Variables", "Java Basics", "Sample Assignment", "Image", "Sample Topic", "Hello Java"]
);
check(
  "Placed Quiz Move Down crosses the Image below it",
  move(recordedLesson(), "Java Basics", "down"),
  ["Data Types", "Variables", "Sample Assignment", "Image", "Java Basics", "Sample Topic", "Hello Java"]
);
check(
  "Assignment Move Up crosses the Topic above it",
  move(recordedLesson(), "Sample Assignment", "up"),
  ["Data Types", "Sample Assignment", "Variables", "Java Basics", "Image", "Sample Topic", "Hello Java"]
);
check(
  "Assignment Move Down crosses the Quiz below it",
  move(recordedLesson(), "Sample Assignment", "down"),
  ["Data Types", "Variables", "Java Basics", "Sample Assignment", "Image", "Sample Topic", "Hello Java"]
);

// --- 10. Boundaries come from the whole mixed sequence ------------------------
check("The first item cannot move up", move(recordedLesson(), "Data Types", "up"), null);
check("The last item cannot move down", move(recordedLesson(), "Hello Java", "down"), null);
check(
  "The last Topic CAN move down when Content follows it (was disabled)",
  move(recordedLesson(), "Sample Topic", "down") !== null,
  true
);
check(
  "The first Topic CAN move up when Content precedes it",
  move([content("Intro", 1), container("topic", "T1", 2)], "T1", "up"),
  ["T1", "Intro"]
);
check(
  "A row outside the sequence (an unplaced qualifying quiz) cannot move",
  moveWithinSequence(sequenceOf(recordedLesson()).ids, "q-Qualifying", "up"),
  null
);
check("A one-item sequence has nowhere to go", move([container("topic", "Only", 1)], "Only", "down"), null);

// --- 11. Non-contiguous stored orders (a duplicated course skips QUIZ rows) ---
const gapped = () => [content("A", 1), container("topic", "Y", 2), content("X", 4, "IMAGE"), content("B", 5)];
check("Across a gap, Move Up still goes exactly one slot", move(gapped(), "X", "up"), ["A", "X", "Y", "B"]);
check("Across a gap, Move Down still goes exactly one slot", move(gapped(), "Y", "down"), ["A", "X", "Y", "B"]);
check(
  "The new orders are a gap-free 1..n over the complete sequence",
  sequenceOrders(["c-A", "c-X", "topic-Y", "c-B"]),
  [
    { id: "c-A", order: 1 },
    { id: "c-X", order: 2 },
    { id: "topic-Y", order: 3 },
    { id: "c-B", order: 4 },
  ]
);

// --- 15. Consecutive moves read the order the previous move wrote -------------
{
  // Write each move's orders back onto the rows — what the optimistic cache
  // update does — then move again from the re-sorted list.
  let rows = recordedLesson();
  const titles = [];
  for (let step = 0; step < 3; step++) {
    const seq = sequenceOf(rows);
    const orderedIds = moveWithinSequence(seq.ids, "topic-Sample Topic", "up");
    const orderOf = new Map(sequenceOrders(orderedIds).map(({ id, order }) => [id, order]));
    rows = rows.map((row) => ({ ...row, order: orderOf.get(sequenceMemberId(row)) }));
    titles.push(sequenceOf(rows).titles(sequenceOf(rows).ids).indexOf("Sample Topic"));
  }
  check("Three Move Ups in a row walk the Topic up one slot each time", titles, [4, 3, 2]);
}

// --- Ordering and identity rules the moves rely on ----------------------------
check(
  "Content-backed rows are known by their Content row id; containers by their own id",
  [sequenceMemberId(content("Image", 1)), sequenceMemberId(quiz("Q", 2)), sequenceMemberId(assignment("A", 3)), sequenceMemberId(container("topic", "T", 4))],
  ["c-Image", "cq-Q", "ca-A", "topic-T"]
);
check(
  "On a legacy tie Content sorts before a container, then by creation time",
  [
    { ...container("topic", "Tie topic", 1), createdAt: "2026-01-01T00:00:00Z" },
    { ...content("Late", 1), createdAt: "2026-03-01T00:00:00Z" },
    { ...content("Early", 1), createdAt: "2026-02-01T00:00:00Z" },
  ]
    .sort(bySequenceOrder)
    .map((row) => row.title),
  ["Early", "Late", "Tie topic"]
);
{
  const ids = sequenceOf(recordedLesson()).ids;
  const before = [...ids];
  moveWithinSequence(ids, "topic-Sample Topic", "up");
  check("A move does not change the caller's list", ids, before);
}

console.log(`\nRESULTS: ${passed} Passed, ${failed} Failed`);
if (failed > 0) {
  process.exit(1);
}

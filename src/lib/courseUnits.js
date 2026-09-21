import { groupLessonContentForDocumentView } from "./contentDocument.js";

/**
 * The whole-course Prev/Next sequence for the student learning player —
 * every stop the player can land on, in exactly the order the Course Map
 * lists rows at each level (CourseComposerSidebar's ParentContentRows):
 * sorted by `order`, ties broken by creation time, then content before
 * child rows (Lessons/Topics/SubTopics/Concepts) before quizzes. Next
 * therefore walks the Course Map top to bottom; it used to put a level's own
 * content before its children, which disagreed with the map and stranded
 * students.
 *
 * The Course level is the one exception: its rows are grouped Content ->
 * Modules -> Assignments -> Quizzes (see courseMapOrder), because a
 * course-level Assignment is only given once every Module is done. Within a
 * group `order` decides, exactly as everywhere else. Within a Module, its own
 * content/quizzes are interleaved with its Lessons; within a Lesson that has Topics, its own content/quizzes are
 * interleaved with its Topics — and the same rule repeats one and two levels
 * down: a Topic that has SubTopics interleaves its own items with its
 * SubTopics, and a SubTopic that has Concepts interleaves its own items with
 * its Concepts. Consecutive own items of one kind form one unit.
 *
 * The deepest container on a branch is a `placeholder` unit — a zero-Topic
 * Lesson, a zero-SubTopic Topic, a zero-Concept SubTopic, or a Concept. The
 * page derives those blocks from its selected Lesson/Topic/SubTopic/Concept
 * itself (see resolveLessonPathway). A container WITH children is never a
 * placeholder: its own items become their own units, so a Topic whose only
 * material lives in SubTopics never produces an empty stop.
 *
 * Keys: `lesson:<id>`, `topic:<id>`, `subtopic:<id>` and `concept:<id>` for
 * placeholders, and `<course|module|lesson|topic|subtopic>-<content|quiz>:<id>:<n>`
 * for a level's own items. Every unit's `scope` carries
 * `{ moduleId, lessonId, topicId, subTopicId, conceptId }`; `scopeLevel`
 * reads which level a unit belongs to.
 */
const RANK = { content: 1, child: 2, quiz: 3 };

// Exported so resumeTarget.js's leaf sequence can be sorted by the exact same
// rule the player itself uses — the two must never independently drift.
export function mapOrder(a, b) {
  const orderDiff = (a.item.order ?? 0) - (b.item.order ?? 0);
  if (orderDiff !== 0) return orderDiff;
  if (a.item.createdAt && b.item.createdAt) {
    const timeDiff = new Date(a.item.createdAt).getTime() - new Date(b.item.createdAt).getTime();
    if (timeDiff !== 0) return timeDiff;
  }
  return RANK[a.kind] - RANK[b.kind];
}

/**
 * COURSE LEVEL ONLY: the four groups the backend keeps a Course sequence in
 * (see the API's contentOrder.util.js). `child` is a Module here — the row
 * kind courseUnits/resumeTarget use for a level's child container.
 */
export const COURSE_GROUP_RANK = { content: 1, module: 2, child: 2, assignment: 3, quiz: 4 };
export const courseGroupRank = (kind) => COURSE_GROUP_RANK[kind] ?? COURSE_GROUP_RANK.content;

/**
 * The Course level's row order: its group first, then the usual `order` rule.
 * Reading the group from the row kind (rather than trusting `order` alone)
 * keeps a course whose rows predate the grouping — or one being written by a
 * request still in flight — from ever showing a Quiz or Assignment between
 * two Modules.
 */
export function courseMapOrder(a, b) {
  const groupDiff = courseGroupRank(a.kind) - courseGroupRank(b.kind);
  if (groupDiff !== 0) return groupDiff;
  return mapOrder(a, b);
}

/** Display names for each hierarchy level, keyed the way scopeLevel/resolveLessonPathway report them. */
export const HIERARCHY_LEVEL_LABELS = {
  course: "Course",
  module: "Module",
  lesson: "Lesson",
  topic: "Topic",
  subTopic: "SubTopic",
  concept: "Concept",
};

/** The most specific level a unit scope points at. */
export function scopeLevel(scope) {
  if (scope?.conceptId) return "concept";
  if (scope?.subTopicId) return "subTopic";
  if (scope?.topicId) return "topic";
  if (scope?.lessonId) return "lesson";
  if (scope?.moduleId) return "module";
  return "course";
}

/**
 * The placeholder unit key for the deepest container named by these ids —
 * the same key buildCourseUnits gives that container's placeholder.
 */
export function pathwayUnitKey({ lessonId = null, topicId = null, subTopicId = null, conceptId = null } = {}) {
  if (conceptId) return `concept:${conceptId}`;
  if (subTopicId) return `subtopic:${subTopicId}`;
  if (topicId) return `topic:${topicId}`;
  return `lesson:${lessonId}`;
}

const pickChild = (children, id) => {
  if (!children || children.length === 0) return null;
  return children.find((child) => child.id === id) || children[0];
};

/**
 * Resolves the Lesson pathway the player is on from its selected ids, down to
 * the deepest container — defaulting to the first child at every level where
 * no (or no matching) id is selected, the same "a Lesson lands on its first
 * Topic" rule the player already used, applied to SubTopics and Concepts.
 *
 * @returns {{ topic, subTopic, concept, container, level, unitKey }} where
 *   `container` is the node whose own contents/quizzes the player shows
 *   (the Lesson itself when it has no Topics).
 */
export function resolveLessonPathway(lesson, { topicId = null, subTopicId = null, conceptId = null } = {}) {
  if (!lesson) {
    return { topic: null, subTopic: null, concept: null, container: null, level: null, unitKey: null };
  }
  const topic = pickChild(lesson.topics, topicId);
  const subTopic = topic ? pickChild(topic.subTopics, subTopicId) : null;
  const concept = subTopic ? pickChild(subTopic.concepts, conceptId) : null;
  const container = concept || subTopic || topic || lesson;
  const level = concept ? "concept" : subTopic ? "subTopic" : topic ? "topic" : "lesson";

  return {
    topic,
    subTopic,
    concept,
    container,
    level,
    unitKey: pathwayUnitKey({
      lessonId: lesson.id,
      topicId: topic?.id,
      subTopicId: subTopic?.id,
      conceptId: concept?.id,
    }),
  };
}

export function buildCourseUnits(course) {
  const units = [];
  if (!course) return units;

  // One level's own content and quizzes interleaved with its child rows.
  // A child row breaks the current run of own items and is handed to onChild.
  const walkLevel = ({ keyPrefix, keyId, scope, contents, quizzes, children = [], onChild, compare = mapOrder }) => {
    const rows = [
      ...(contents || []).map((item) => ({ kind: "content", item })),
      ...(quizzes || []).map((item) => ({ kind: "quiz", item })),
      ...children.map((item) => ({ kind: "child", item })),
    ].sort(compare);

    let run = null;
    let runIndex = 0;
    const flush = () => {
      if (!run) return;
      const blocks =
        run.kind === "content"
          ? groupLessonContentForDocumentView(run.items).map((item) => ({ kind: "content", item }))
          : run.items.map((item) => ({ kind: "quiz", item }));
      units.push({ key: `${keyPrefix}-${run.kind}:${keyId}:${runIndex++}`, scope, blocks });
      run = null;
    };

    for (const row of rows) {
      if (row.kind === "child") {
        flush();
        onChild?.(row.item);
        continue;
      }
      if (run && run.kind !== row.kind) flush();
      if (!run) run = { kind: row.kind, items: [] };
      run.items.push(row.item);
    }
    flush();
  };

  // A SubTopic with no Concepts is itself the pathway; with Concepts, its own
  // items interleave with them (and each Concept is always a placeholder).
  const walkSubTopic = (subTopic, topicScope) => {
    const subTopicScope = { ...topicScope, subTopicId: subTopic.id };
    if ((subTopic.concepts?.length ?? 0) === 0) {
      units.push({ key: `subtopic:${subTopic.id}`, scope: subTopicScope, placeholder: true });
      return;
    }
    walkLevel({
      keyPrefix: "subtopic",
      keyId: subTopic.id,
      scope: subTopicScope,
      contents: subTopic.contents,
      quizzes: subTopic.quizzes,
      children: subTopic.concepts,
      onChild: (concept) =>
        units.push({
          key: `concept:${concept.id}`,
          scope: { ...subTopicScope, conceptId: concept.id },
          placeholder: true,
        }),
    });
  };

  // A Topic with no SubTopics is itself the pathway — exactly the behavior
  // every existing course already has.
  const walkTopic = (topic, lessonScope) => {
    const topicScope = { ...lessonScope, topicId: topic.id };
    if ((topic.subTopics?.length ?? 0) === 0) {
      units.push({ key: `topic:${topic.id}`, scope: topicScope, placeholder: true });
      return;
    }
    walkLevel({
      keyPrefix: "topic",
      keyId: topic.id,
      scope: topicScope,
      contents: topic.contents,
      quizzes: topic.quizzes,
      children: topic.subTopics,
      onChild: (subTopic) => walkSubTopic(subTopic, topicScope),
    });
  };

  const noScope = { moduleId: null, lessonId: null, topicId: null, subTopicId: null, conceptId: null };

  const walkModule = (mod) => {
    const moduleScope = { ...noScope, moduleId: mod.id };
    walkLevel({
      keyPrefix: "module",
      keyId: mod.id,
      scope: moduleScope,
      contents: mod.contents,
      quizzes: mod.quizzes,
      children: mod.lessons || [],
      onChild: (lesson) => {
        const lessonScope = { ...moduleScope, lessonId: lesson.id };
        if ((lesson.topics?.length ?? 0) === 0) {
          // A zero-Topic Lesson's own content and quizzes ARE the pathway.
          units.push({ key: `lesson:${lesson.id}`, scope: lessonScope, placeholder: true });
          return;
        }
        walkLevel({
          keyPrefix: "lesson",
          keyId: lesson.id,
          scope: lessonScope,
          contents: lesson.contents,
          quizzes: lesson.quizzes,
          children: lesson.topics,
          onChild: (topic) => walkTopic(topic, lessonScope),
        });
      },
    });
  };

  // Course level: its own content/quizzes and its Modules are ONE sequence,
  // walked in the Course groups — Content, then Modules, then (Assignments,
  // which are not player stops), then Quizzes.
  walkLevel({
    keyPrefix: "course",
    keyId: "root",
    scope: noScope,
    contents: course.contents,
    quizzes: course.quizzes,
    children: course.modules || [],
    onChild: walkModule,
    compare: courseMapOrder,
  });

  return units;
}

/**
 * The non-placeholder unit holding an item — a content id (including one
 * merged into a document block) or a quiz id. Course Map clicks on rows
 * outside the placeholder pathway resolve through this.
 */
export function findUnitContaining(units, itemId) {
  if (!itemId) return undefined;
  return (units || []).find(
    (unit) =>
      !unit.placeholder &&
      (unit.blocks || []).some((b) => b.item.id === itemId || b.item.contentIds?.includes(itemId))
  );
}

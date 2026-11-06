// Saving a quiz from the course composer: the editor's question list is
// diffed against what the quiz had, and only the difference goes to the API.
//
// Every request reaches a remote database, so a save that re-sent each of a
// quiz's questions one by one took seconds per ten questions even when only
// the title changed. Unchanged questions are now skipped, and the rest are
// sent a few at a time instead of one after another.

// What /questions/bulk and /questions/:id expect from the editor's shape.
export const mapQuestionForApi = (q) => ({
  question: q.question,
  questionType: q.questionType,
  options: q.options,
  correctAnswer: q.correctAnswer,
  explanation: q.explanation,
  marks: Number(q.marks) || 1,
  difficulty: q.difficulty,
});

const isNewQuestion = (q) => !q.id || String(q.id).startsWith("draft-");

// Key order cannot make two equal payloads look different.
const stableStringify = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .filter((k) => value[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
};

/**
 * @param currentQuestions    the editor's list at save time
 * @param originalQuestionIds ids the quiz had before this save (empty for a new quiz)
 * @param loadedQuestions     the editor's list as it was loaded, in the same shape
 *                            as currentQuestions. A question with no entry here is
 *                            always re-saved, so leaving it out is the old behaviour.
 */
export function planQuizQuestionSync({ currentQuestions = [], originalQuestionIds = [], loadedQuestions = [] }) {
  const originalIdSet = new Set(originalQuestionIds.map(String));
  const loadedPayloadById = new Map(
    loadedQuestions.filter((q) => !isNewQuestion(q)).map((q) => [String(q.id), stableStringify(mapQuestionForApi(q))])
  );

  const existing = currentQuestions.filter((q) => !isNewQuestion(q));
  const keptIds = new Set(existing.map((q) => String(q.id)));

  return {
    create: currentQuestions.filter(isNewQuestion).map(mapQuestionForApi),
    // A repository question picked via "From Repository" already has a real id
    // but wasn't this quiz's before — attach it as-is rather than overwriting
    // its (possibly shared, used-elsewhere) content.
    attach: existing.filter((q) => !originalIdSet.has(String(q.id))).map((q) => q.id),
    update: existing
      .filter((q) => originalIdSet.has(String(q.id)))
      .map((q) => ({ id: q.id, payload: mapQuestionForApi(q) }))
      .filter(({ id, payload }) => loadedPayloadById.get(String(id)) !== stableStringify(payload)),
    remove: originalQuestionIds.filter((id) => !keptIds.has(String(id))),
  };
}

// Runs every task, at most `limit` at once. All of them finish before the
// first failure (if any) is thrown, so one bad question doesn't stop the rest.
async function runAllWithLimit(tasks, limit) {
  let next = 0;
  let firstError = null;
  const worker = async () => {
    while (next < tasks.length) {
      const task = tasks[next++];
      try {
        await task();
      } catch (err) {
        firstError ??= err;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  if (firstError) throw firstError;
}

/**
 * @param services { bulkCreate(quizId, payloads), attach(quizId, ids), update(id, payload), remove(quizId, id) }
 */
export async function runQuizQuestionSync(quizId, plan, services, { concurrency = 4 } = {}) {
  if (plan.create.length > 0) await services.bulkCreate(quizId, plan.create);
  if (plan.attach.length > 0) await services.attach(quizId, plan.attach);
  await runAllWithLimit(
    [
      ...plan.update.map(({ id, payload }) => () => services.update(id, payload)),
      ...plan.remove.map((id) => () => services.remove(quizId, id)),
    ],
    concurrency
  );
}

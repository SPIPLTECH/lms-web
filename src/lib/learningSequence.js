/**
 * Client-side edits to a cached learning sequence (GET /progress/learning-sequence),
 * applied after a mutation the server has already accepted, so the player does
 * not have to refetch the whole sequence to show it.
 */

/**
 * Marks the steps whose Content rows were all just visited. Returns the same
 * object when nothing changes (so React Query keeps its reference), otherwise
 * a copy — the input is never mutated.
 *
 * Only `visited`/`visitedAt` move: a visit never unlocks a step (locks follow
 * completion — backend utils/learningSequence.js), and a merged step counts as
 * visited only once every one of its parts is, as on the server.
 *
 * @param {{ steps?: Array }} sequence  cached learning sequence
 * @param {Iterable<string>} contentIds Content ids just recorded as visited
 * @param {string} visitedAt            ISO timestamp to stamp on those steps
 */
export function markStepsVisited(sequence, contentIds, visitedAt) {
  if (!Array.isArray(sequence?.steps)) return sequence;
  const ids = new Set(contentIds);
  if (ids.size === 0) return sequence;

  let touched = false;
  const steps = sequence.steps.map((step) => {
    const parts = step.contentIds?.length ? step.contentIds : [step.contentId];
    if (step.visited || !parts.every((id) => ids.has(id))) return step;
    touched = true;
    return { ...step, visited: true, visitedAt };
  });
  return touched ? { ...sequence, steps } : sequence;
}

/**
 * Marks the steps whose Content rows were all just completed (or marked
 * incomplete). Same contract as markStepsVisited: same object back when
 * nothing changes, otherwise a copy.
 *
 * Only `completed` moves. Completing a step can unlock the next one, but
 * that is the server's call — useCompleteContent still refetches the
 * sequence for the locks; this only keeps the step on screen from offering
 * "Mark as Complete" again while that refetch is in flight.
 *
 * @param {{ steps?: Array }} sequence  cached learning sequence
 * @param {Iterable<string>} contentIds Content ids the server just recorded
 * @param {boolean} completed           the value it recorded
 */
export function markStepsCompleted(sequence, contentIds, completed) {
  if (!Array.isArray(sequence?.steps)) return sequence;
  const ids = new Set(contentIds);
  if (ids.size === 0) return sequence;

  let touched = false;
  const steps = sequence.steps.map((step) => {
    const parts = step.contentIds?.length ? step.contentIds : [step.contentId];
    if (Boolean(step.completed) === completed || !parts.every((id) => ids.has(id))) return step;
    touched = true;
    return { ...step, completed };
  });
  return touched ? { ...sequence, steps } : sequence;
}

/**
 * Marks the step of a quiz the server just accepted an attempt for as
 * attempted. Same contract as the two above.
 *
 * Only `attempted` moves — the one fact a successful submission states.
 * Whether that attempt COMPLETES the step (a Final needs a pass) and what it
 * unlocks are the server's rules, read from the refetched sequence. The
 * player keys "a quiz is being attempted" (no Previous/Next, no AI) on this
 * flag, so without it the bottom bar stayed hidden until that refetch landed.
 *
 * @param {{ steps?: Array }} sequence cached learning sequence
 * @param {string} quizId              the quiz just submitted
 */
export function markQuizStepAttempted(sequence, quizId) {
  if (!Array.isArray(sequence?.steps) || !quizId) return sequence;

  let touched = false;
  const steps = sequence.steps.map((step) => {
    if (step.quizId !== quizId || step.attempted) return step;
    touched = true;
    return { ...step, attempted: true };
  });
  return touched ? { ...sequence, steps } : sequence;
}

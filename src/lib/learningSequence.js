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

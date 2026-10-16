import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import {
  markContentComplete,
  markContentCompleteBatch,
  completeLesson as completeLessonApi,
  markVisited as markVisitedApi,
} from "@/services/progress.service";

/**
 * Marks Content complete/incomplete through the existing
 * POST /progress/content-complete endpoint, then refetches the authoritative
 * Progress roll-up. Nothing about the percentage is computed here.
 *
 * Accepts either a single `contentId` or a `contentIds` array. The array form
 * exists because one displayed block in the player can stand for several real
 * Content rows: groupLessonContentForDocumentView() merges consecutive HTML
 * rows into one readable document and records every underlying id in
 * `contentIds`. The backend counts each of those rows separately in the
 * Progress denominator, so completing the block has to complete all of them —
 * marking only the representative id would leave the merged-away rows
 * permanently incomplete and their ancestors permanently short of 100%.
 *
 * A multi-id block goes through ONE batched request, not one request per id:
 * the backend used to recompute the whole course roll-up separately for each
 * id in parallel, and whichever recompute's read landed before another
 * id's write committed would persist a rollup missing that other id's
 * completion — a lost update that could leave "Mark as Complete" looking
 * like it silently did nothing, or still offering itself after the item was
 * already completed.
 */
export function useCompleteContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contentId, contentIds, completed = true }) => {
      const ids = (Array.isArray(contentIds) && contentIds.length > 0
        ? contentIds
        : [contentId]
      ).filter(Boolean);

      return ids.length > 1
        ? markContentCompleteBatch(ids, completed)
        : markContentComplete(ids[0], completed);
    },
    onSuccess: (data) => {
      // The response's `courseProgress` (when present) IS the exact payload
      // GET /progress/courses/:courseId would return — the backend already
      // recomputed it, in the SAME request that just confirmed the write, to
      // avoid this. Writing it straight into the cache means the button's
      // `completed` flag updates from data we already have in hand, instead
      // of invalidating and waiting on a second network round trip that
      // triggers a second full server-side rollup just to re-fetch numbers
      // this response already carries. That second round trip was also a
      // real source of "Mark as Complete" reappearing: if it was ever slow,
      // dropped, or raced by another in-flight fetch, the UI had nothing else
      // to fall back on and settled on stale/absent data instead of the
      // completion this mutation had already confirmed.
      const fresh = data?.courseProgress;
      if (fresh?.hierarchy) {
        queryClient.setQueriesData({ queryKey: [QUERY_KEYS.COURSE_PROGRESS] }, (old) => {
          // Only overwrite the exact (course, student) this completion is
          // for — leaves any other cached course's/student's progress (e.g.
          // an instructor with several students' views cached) untouched.
          if (!old || old.courseId !== fresh.courseId || old.studentId !== fresh.studentId) return old;
          return fresh;
        });
      } else {
        // The backend couldn't return a fresh rollup this one time (the
        // completion itself still saved — see progress.service.js). Fall
        // back to a real refetch so the UI still converges on the truth
        // instead of quietly keeping stale numbers.
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.COURSE_PROGRESS] });
      }
      // These three feed the dashboard/course catalog, not this page —
      // marking them stale is enough. React Query only actually refetches a
      // query that's currently mounted, so this doesn't force extra network
      // calls unless one of those views also happens to be on screen.
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROGRESS] });
      // Completing content can settle the node the student is on and open
      // the next one, so the gate has to be refetched alongside the numbers.
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LEARNING_PATH] });
      // The next action is derived from the path and the evidence, so it
      // moves whenever either does.
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.NEXT_ACTION] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RECOMMENDATIONS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STUDENT_DASHBOARD] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MY_COURSES] });
    }
  });
}

/**
 * Marks a Content/Quiz block as visited the first time the player shows it —
 * drives "Continue Learning" resume tracking (see lib/resumeTarget.js). Only
 * invalidates COURSE_PROGRESS: a visit never changes Enrollment.progressPercent
 * (that's completion-based), so the dashboard/My Courses queries have nothing
 * new to reflect and don't need refetching on every block view.
 *
 * Accepts either a single `contentId` or a `contentIds` array (same reason as
 * useCompleteContent above: a merged document block stands for several real
 * Content rows, every one of which needs its own visited flag) — or one of
 * the other entity ids (quizId, topicId, ...) markVisitedSchema accepts.
 */
export function useMarkVisited() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contentId, contentIds, ...rest } = {}) => {
      const ids = (Array.isArray(contentIds) && contentIds.length > 0 ? contentIds : [contentId]).filter(Boolean);
      if (ids.length > 0) {
        return Promise.all(ids.map((id) => markVisitedApi({ contentId: id, ...rest })));
      }
      return markVisitedApi(rest);
    },
    onSuccess: (data) => {
      // The backend now skips the write (and the rollup) entirely for a
      // revisit that doesn't change anything, and reports that via
      // `changed: false`. Mirror that here: don't invalidate (and force a
      // refetch + another full rollup) for a call that changed nothing.
      // `data` is one response for a single id, or an array for a batch —
      // `changed` missing/undefined is treated as "changed" so an older/
      // unexpected response shape still falls back to the old behavior.
      const results = Array.isArray(data) ? data : [data];
      const anyChanged = results.some((r) => r?.changed !== false);
      if (anyChanged) {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.COURSE_PROGRESS] });
      }
    }
  });
}

export function useCompleteLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ lessonId, completed = true }) => completeLessonApi(lessonId, completed),
    onSuccess: (data) => {
      // Same reasoning as useCompleteContent above: write the response's
      // already-fresh rollup straight into the cache instead of paying for a
      // second network round trip + a second full server-side rollup.
      const fresh = data?.courseProgress;
      if (fresh?.hierarchy) {
        queryClient.setQueriesData({ queryKey: [QUERY_KEYS.COURSE_PROGRESS] }, (old) => {
          if (!old || old.courseId !== fresh.courseId || old.studentId !== fresh.studentId) return old;
          return fresh;
        });
      } else {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.COURSE_PROGRESS] });
      }
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROGRESS] });
      // Completing content can settle the node the student is on and open
      // the next one, so the gate has to be refetched alongside the numbers.
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LEARNING_PATH] });
      // The next action is derived from the path and the evidence, so it
      // moves whenever either does.
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.NEXT_ACTION] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RECOMMENDATIONS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STUDENT_DASHBOARD] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MY_COURSES] });
    }
  });
}

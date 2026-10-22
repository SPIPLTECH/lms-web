"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { getPlaybackStatus } from "@/services/playback.service";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { isContentBlockedError, isPlaybackHeldElsewhere } from "@/lib/sessionErrors";

// How often an open content page re-checks whether another device of this
// account started playing. It also re-checks on returning to the tab and at
// once after any refused request; each check is a database transaction on
// the API, so this is not a tight loop.
const RECHECK_MS = 10 * 1000;

// Course content this browser may already hold in memory. Dropped when access
// is blocked, so nothing previously fetched is shown again as if it were
// newly authorized — it is fetched afresh once access returns.
const PROTECTED_KEYS = new Set([
  QUERY_KEYS.COURSE,
  QUERY_KEYS.LEARNING_SEQUENCE,
  QUERY_KEYS.LEARNING_PATH,
  QUERY_KEYS.CONTENT,
  QUERY_KEYS.CONTENTS,
  QUERY_KEYS.MODULE,
  QUERY_KEYS.MODULES,
  QUERY_KEYS.LESSON,
  QUERY_KEYS.LESSONS,
  QUERY_KEYS.TOPIC,
  QUERY_KEYS.TOPICS,
  QUERY_KEYS.SUBTOPIC,
  QUERY_KEYS.SUBTOPICS,
  QUERY_KEYS.CONCEPT,
  QUERY_KEYS.CONCEPTS,
  QUERY_KEYS.QUIZ,
  QUERY_KEYS.QUIZZES,
  QUERY_KEYS.QUESTION,
  QUERY_KEYS.QUESTIONS,
  QUERY_KEYS.QUIZ_RESULT,
  QUERY_KEYS.STUDENT_QUIZZES,
  QUERY_KEYS.STUDENT_QUIZ_SUBMISSIONS,
  QUERY_KEYS.STUDENT_QUESTIONS,
  QUERY_KEYS.STUDENT_ASSIGNMENT,
  QUERY_KEYS.STUDENT_ASSIGNMENTS,
  QUERY_KEYS.STUDENT_STATE,
  QUERY_KEYS.COURSE_STATE,
  QUERY_KEYS.NOTES,
  QUERY_KEYS.BOOKMARKS,
  QUERY_KEYS.STICKY_NOTES,
  QUERY_KEYS.LESSON_NOTES,
  QUERY_KEYS.LESSON_QUERIES,
  QUERY_KEYS.MY_LESSON_QUERIES,
  QUERY_KEYS.PROGRESS,
  QUERY_KEYS.COURSE_PROGRESS,
  QUERY_KEYS.TRANSCRIPT,
  QUERY_KEYS.MY_QUESTIONS,
  QUERY_KEYS.DISCUSSIONS,
  QUERY_KEYS.RECOMMENDATIONS,
  QUERY_KEYS.NEXT_ACTION,
  QUERY_KEYS.LEARNING_SIGNALS,
  QUERY_KEYS.AI_CONVERSATIONS,
  QUERY_KEYS.AI_MESSAGES,
  QUERY_KEYS.EXAM,
  QUERY_KEYS.EXAMS,
  QUERY_KEYS.RESULTS,
  QUERY_KEYS.ASSESSMENTS,
]);

/**
 * STUDENT content-access rule, client side: while another device of this
 * account holds the playback lease, this device shows no course content.
 * The API enforces the rule (409 CONTENT_ACTIVE_ON_ANOTHER_DEVICE); this hook
 * makes the page follow it:
 *  - re-checks GET /playback/status frequently and on returning to the tab,
 *    so a page opened BEFORE the other device started playing is blocked too;
 *  - reacts at once to any request the API refused with the rule's code;
 *  - on block, cancels pending queries and drops cached course content from React Query;
 *  - `retry()` re-checks; access resumes only when the API says the other
 *    device's lease is gone (stopped or expired). It also resumes by itself
 *    when a later check finds the lease gone.
 *
 * @returns {{ blocked: boolean, checking: boolean, loadingInitial: boolean, retry: () => Promise<void> }}
 */
export default function useContentAccess({ enabled = true } = {}) {
  const queryClient = useQueryClient();
  // When a protected request was last refused (ms), or 0.
  const [refusedAt, setRefusedAt] = useState(0);

  const status = useQuery({
    queryKey: [QUERY_KEYS.PLAYBACK_STATUS],
    queryFn: getPlaybackStatus,
    enabled,
    staleTime: 0,
    refetchInterval: RECHECK_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: false,
  });

  const heldElsewhere = isPlaybackHeldElsewhere(status.data);
  // Stable handle for listeners (the query object itself changes every render).
  const refetchRef = useRef(status.refetch);
  refetchRef.current = status.refetch;

  // Any query or mutation refused by the API under this rule blocks the page
  // now, without waiting for the next check. Also immediately refetches status.
  useEffect(() => {
    if (!enabled) return undefined;
    const onEvent = (event) => {
      if (event?.type !== "updated") return;
      const error = event.query?.state?.error ?? event.mutation?.state?.error;
      if (error && isContentBlockedError(error)) {
        setRefusedAt(Date.now());
        refetchRef.current();
      }
    };
    const offQueries = queryClient.getQueryCache().subscribe(onEvent);
    const offMutations = queryClient.getMutationCache().subscribe(onEvent);
    return () => {
      offQueries();
      offMutations();
    };
  }, [enabled, queryClient]);

  // Refusals outside React Query (file viewers, the axios interceptor).
  useEffect(() => {
    if (!enabled) return undefined;
    const onBlockedEvent = () => {
      setRefusedAt(Date.now());
      refetchRef.current();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("lms:content-blocked", onBlockedEvent);
      return () => window.removeEventListener("lms:content-blocked", onBlockedEvent);
    }
  }, [enabled]);

  // A check made after the refusal that finds no lease elsewhere lifts it.
  useEffect(() => {
    if (refusedAt && status.dataUpdatedAt > refusedAt && !heldElsewhere) setRefusedAt(0);
  }, [refusedAt, status.dataUpdatedAt, heldElsewhere]);

  const blocked = enabled && (heldElsewhere || refusedAt > 0);

  // Drop and cancel previously fetched or in-flight course content once blocked.
  // The guard unmounts the content so nothing re-renders from cache or memory.
  useEffect(() => {
    if (blocked) {
      queryClient.cancelQueries({ predicate: (query) => PROTECTED_KEYS.has(query.queryKey?.[0]) });
      queryClient.removeQueries({ predicate: (query) => PROTECTED_KEYS.has(query.queryKey?.[0]) });
    }
  }, [blocked, queryClient]);

  const retry = useCallback(async () => {
    const result = await refetchRef.current();
    if (!isPlaybackHeldElsewhere(result.data) && !result.error) setRefusedAt(0);
  }, []);

  // Only the FIRST check gates the page: until it answers, nothing is shown;
  // if it fails, the guard says so. After that a failed re-check keeps the
  // last answer — tearing the page down over a network blip would unmount the
  // lease holder's player (ending its lease) while the API, which enforces the
  // rule itself, has refused nothing.
  const loadingInitial = enabled && status.isLoading && status.data === undefined;
  const isError = enabled && status.isError && status.data === undefined;

  return { blocked, checking: status.isFetching, loadingInitial, isError, error: status.error, retry };
}

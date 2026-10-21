"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { getPlaybackStatus } from "@/services/playback.service";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { isContentBlockedError, isPlaybackHeldElsewhere } from "@/lib/sessionErrors";

// How often an open content page re-checks whether another device of this
// account started playing (also on returning to the tab).
const RECHECK_MS = 30 * 1000;

// Course content this browser may already hold in memory. Dropped when access
// is blocked, so nothing previously fetched is shown again as if it were
// newly authorized — it is fetched afresh once access returns.
const PROTECTED_KEYS = new Set([
  QUERY_KEYS.COURSE,
  QUERY_KEYS.LEARNING_SEQUENCE,
  QUERY_KEYS.LEARNING_PATH,
  QUERY_KEYS.CONTENT,
  QUERY_KEYS.CONTENTS,
  QUERY_KEYS.QUIZ,
  QUERY_KEYS.QUIZ_RESULT,
  QUERY_KEYS.STUDENT_ASSIGNMENT,
]);

/**
 * STUDENT content-access rule, client side: while another device of this
 * account holds the playback lease, this device shows no course content.
 * The API enforces the rule (409 CONTENT_ACTIVE_ON_ANOTHER_DEVICE); this hook
 * makes the page follow it:
 *  - re-checks GET /playback/status every 30 s and on returning to the tab,
 *    so a page opened BEFORE the other device started playing is blocked too;
 *  - reacts at once to any request the API refused with the rule's code;
 *  - on block, drops cached course content from React Query;
 *  - `retry()` re-checks; access resumes only when the API says the other
 *    device's lease is gone (stopped or expired). It also resumes by itself
 *    when a later check finds the lease gone.
 *
 * @returns {{ blocked: boolean, checking: boolean, retry: () => Promise<void> }}
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

  // Any query or action refused by the API under this rule blocks the page
  // now, without waiting for the next check.
  useEffect(() => {
    if (!enabled) return undefined;
    const onEvent = (event) => {
      if (event?.type !== "updated") return;
      const error = event.query?.state?.error ?? event.mutation?.state?.error;
      if (error && isContentBlockedError(error)) setRefusedAt(Date.now());
    };
    const offQueries = queryClient.getQueryCache().subscribe(onEvent);
    const offMutations = queryClient.getMutationCache().subscribe(onEvent);
    return () => {
      offQueries();
      offMutations();
    };
  }, [enabled, queryClient]);

  // A check made after the refusal that finds no lease elsewhere lifts it.
  useEffect(() => {
    if (refusedAt && status.dataUpdatedAt > refusedAt && !heldElsewhere) setRefusedAt(0);
  }, [refusedAt, status.dataUpdatedAt, heldElsewhere]);

  const blocked = enabled && (heldElsewhere || refusedAt > 0);

  // Drop previously fetched course content once blocked. The guard has
  // already unmounted the content, so nothing re-renders it from cache.
  const wasBlocked = useRef(false);
  useEffect(() => {
    if (blocked && !wasBlocked.current) {
      queryClient.removeQueries({ predicate: (query) => PROTECTED_KEYS.has(query.queryKey?.[0]) });
    }
    wasBlocked.current = blocked;
  }, [blocked, queryClient]);

  const retry = useCallback(async () => {
    const result = await status.refetch();
    if (!isPlaybackHeldElsewhere(result.data) && !result.error) setRefusedAt(0);
  }, [status]);

  return { blocked, checking: status.isFetching, retry };
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { getLiveClasses } from "@/services/liveClass.service";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { defaultQueryOptions } from "@/lib/queryOptions";

export function useLiveClasses(params = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.LIVE_CLASSES, params],
    queryFn: () => getLiveClasses(params),
    ...defaultQueryOptions,
  });
}

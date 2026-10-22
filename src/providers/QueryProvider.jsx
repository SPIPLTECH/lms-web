"use client";

import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export default function QueryProvider({ children }) {
  const [queryClient] = useState(() => {
    const client = new QueryClient({
      // Any successful write marks every cached query stale: what is on screen
      // refetches now, and everything else refetches when its page next mounts
      // (refetchOnMount below). Per-mutation invalidation alone kept missing
      // keys — an import, an edit or a delete left other pages showing old
      // data until a manual reload. Background writes that change nothing the
      // user is looking at (view tracking, saved position, AI chat) opt out
      // with `meta: { refreshAll: false }`.
      mutationCache: new MutationCache({
        onSuccess: (_data, _variables, _context, mutation) => {
          if (mutation.meta?.refreshAll === false) return;
          client.invalidateQueries();
        },
      }),
      defaultOptions: {
        queries: {
          staleTime: 1000 * 60 * 5,
          gcTime: 1000 * 60 * 30,
          retry: 1,
          refetchOnWindowFocus: false,
          refetchOnReconnect: false,
          // Refetch on mount only when stale — still served from cache within
          // staleTime, but never left showing data a write has invalidated.
          refetchOnMount: true,
        },
      },
    });
    return client;
  });

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

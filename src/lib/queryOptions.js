export const defaultQueryOptions = {
  staleTime: 1000 * 60 * 5,
  gcTime: 1000 * 60 * 30,
  retry: 1,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  // Only refetches when stale (see QueryProvider: every write marks queries stale).
  refetchOnMount: true,
};
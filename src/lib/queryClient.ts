import { QueryClient } from "@tanstack/react-query";

export const SESSION_CACHE_STALE_TIME = 10 * 60 * 1000;
export const SESSION_CACHE_GC_TIME = 4 * 60 * 60 * 1000;
export const CATALOG_CACHE_STALE_TIME = 30 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: SESSION_CACHE_STALE_TIME,
      gcTime: SESSION_CACHE_GC_TIME,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});

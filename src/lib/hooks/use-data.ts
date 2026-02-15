import useSWR from "swr";
import type { DashboardPageData, ChangesApiResponse } from "@/lib/types/analysis";
import type { PageHistoryResponse } from "@/lib/types/pages";

/**
 * Custom error classes for typed error handling
 */
export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

export class FetchError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "FetchError";
    this.status = status;
  }
}

/**
 * Type guard for checking unauthorized errors
 */
export function isUnauthorizedError(error: unknown): error is UnauthorizedError {
  return error instanceof UnauthorizedError;
}

/**
 * Get a human-friendly error message based on HTTP status
 */
function getErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return "Invalid request";
    case 403:
      return "Access denied";
    case 404:
      return "Not found";
    case 429:
      return "Too many requests";
    case 500:
      return "Server error";
    default:
      return "Request failed";
  }
}

// Default fetcher — bypasses browser cache so mutate() always gets fresh data
// Used by usePages, useChanges, usePageHistory (endpoints that change after user actions)
const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: "no-cache" });
  if (res.status === 401) {
    throw new UnauthorizedError();
  }
  if (!res.ok) {
    throw new FetchError(getErrorMessage(res.status), res.status);
  }
  return res.json();
};

/**
 * Fetch user's monitored pages for dashboard
 * Revalidates on focus, dedupes requests within 10s
 */
export function usePages() {
  return useSWR<{ pages: DashboardPageData[] }>("/api/pages", fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 10000,
  });
}

/**
 * Fetch user's validated/regressed changes for dashboard
 * Revalidates on focus, dedupes requests within 30s
 */
export function useChanges() {
  return useSWR<ChangesApiResponse>("/api/changes", fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 30000,
  });
}

// Cacheable fetcher — respects server Cache-Control headers for browser caching
// Used by useAnalysis where data is immutable once complete (revisits benefit from cache)
const cacheableFetcher = async (url: string) => {
  const res = await fetch(url);
  if (res.status === 401) {
    throw new UnauthorizedError();
  }
  if (!res.ok) {
    throw new FetchError(getErrorMessage(res.status), res.status);
  }
  return res.json();
};

/**
 * Fetch a single analysis by ID
 * Polls every 3s while status is pending/processing
 * Dedupes requests within 60s for complete analyses
 */
export function useAnalysis(id: string | null) {
  return useSWR(
    id ? `/api/analysis/${id}` : null,
    cacheableFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
      // Poll while analysis is in progress
      refreshInterval: (data) =>
        data?.status === "pending" || data?.status === "processing" ? 3000 : 0,
    }
  );
}

/**
 * Fetch page history (scan timeline)
 * Revalidates on focus, dedupes requests within 30s
 */
export function usePageHistory(id: string | null) {
  return useSWR<PageHistoryResponse>(
    id ? `/api/pages/${id}/history` : null,
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 30000,
    }
  );
}

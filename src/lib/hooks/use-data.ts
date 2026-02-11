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

// Fetcher with typed error handling
// Uses cache: "no-cache" to bypass browser HTTP cache on SWR revalidation
// (Cache-Control headers still work for CDN/proxy caching)
const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: "no-cache" });
  if (res.status === 401) {
    throw new UnauthorizedError();
  }
  if (!res.ok) {
    throw new FetchError("Fetch failed", res.status);
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

/**
 * Fetch a single analysis by ID
 * Polls every 3s while status is pending/processing
 * Dedupes requests within 60s for complete analyses
 */
export function useAnalysis(id: string | null) {
  return useSWR(
    id ? `/api/analysis/${id}` : null,
    fetcher,
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

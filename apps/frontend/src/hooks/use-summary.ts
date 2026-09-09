"use client";

import { useQuery } from "@tanstack/react-query";
import type { SummaryDto, SummaryQuery } from "@expence/types";
import { apiFetch, buildQuery } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export function useSummary(query: Partial<SummaryQuery> = {}) {
  return useQuery({
    queryKey: queryKeys.summary.byQuery(query as Record<string, string | undefined>),
    queryFn: () =>
      apiFetch<SummaryDto>(
        `/api/summary${buildQuery(query as Record<string, string | undefined>)}`,
      ),
  });
}

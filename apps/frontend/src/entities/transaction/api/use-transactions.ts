"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { TransactionListQuery, TransactionListResponse } from "@expence/types";
import { apiFetch, buildQuery } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export type TransactionListParams = Partial<TransactionListQuery>;

export function useTransactions(params: TransactionListParams) {
  return useQuery({
    queryKey: queryKeys.transactions.list(params),
    queryFn: () => apiFetch<TransactionListResponse>(`/api/transactions${buildQuery(params)}`),
    // Przy zmianie strony albo filtra zostaje poprzedni wynik zamiast migania skeletonem.
    placeholderData: keepPreviousData,
  });
}

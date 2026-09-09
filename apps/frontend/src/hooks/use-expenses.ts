"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateExpenseInput,
  ExpenseDto,
  ExpenseListQuery,
  ExpenseListResponse,
  UpdateExpenseInput,
} from "@expence/types";
import { apiFetch, buildQuery } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export function useExpenses(query: Partial<ExpenseListQuery> = {}) {
  return useQuery({
    queryKey: queryKeys.expenses.list(query),
    queryFn: () =>
      apiFetch<ExpenseListResponse>(
        `/api/expenses${buildQuery(query as Record<string, string | number | undefined>)}`,
      ),
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateExpenseInput) =>
      apiFetch<ExpenseDto>("/api/expenses", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      // Nowy wydatek zmienia zarowno liste, jak i podsumowanie.
      void queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.summary.all });
    },
  });
}

export function useUpdateExpense(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateExpenseInput) =>
      apiFetch<ExpenseDto>(`/api/expenses/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.summary.all });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/api/expenses/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.summary.all });
    },
  });
}

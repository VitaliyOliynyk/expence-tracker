"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateTransactionFormValues, TransactionDto } from "@expence/types";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

/**
 * Body to surowe wartosci formularza (`z.input`), nie wynik walidacji - kwote
 * na grosze przelicza backend tym samym schematem. Wyslanie juz przeliczonych
 * groszy pomnozyloby kwote drugi raz.
 */
function useInvalidateTransactions() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.summary.all });
  };
}

export function useCreateTransaction() {
  const invalidate = useInvalidateTransactions();

  return useMutation({
    mutationFn: (input: CreateTransactionFormValues) =>
      apiFetch<TransactionDto>("/api/transactions", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });
}

export function useUpdateTransaction() {
  const invalidate = useInvalidateTransactions();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CreateTransactionFormValues }) =>
      apiFetch<TransactionDto>(`/api/transactions/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });
}

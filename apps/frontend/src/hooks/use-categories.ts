"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CategoryDto, CreateCategoryInput } from "@expence/types";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: () => apiFetch<CategoryDto[]>("/api/categories"),
    // Kategorie zmieniaja sie rzadko - nie odpytujemy przy kazdym focusie.
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCategoryInput) =>
      apiFetch<CategoryDto>("/api/categories", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });
}

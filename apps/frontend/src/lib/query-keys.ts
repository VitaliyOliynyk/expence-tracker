import type { ExpenseListQuery } from "@expence/types";

/**
 * Jedno miejsce z kluczami cache'a TanStack Query.
 * Dzieki hierarchii `["expenses"]` inwaliduje wszystkie listy naraz.
 */
export const queryKeys = {
  expenses: {
    all: ["expenses"] as const,
    list: (query: Partial<ExpenseListQuery>) => ["expenses", "list", query] as const,
    detail: (id: string) => ["expenses", "detail", id] as const,
  },
  categories: {
    all: ["categories"] as const,
  },
  summary: {
    all: ["summary"] as const,
    byQuery: (query: Record<string, string | undefined>) => ["summary", query] as const,
  },
} as const;

import type { TransactionListQuery } from "@expence/types";

/**
 * Jedno miejsce z kluczami cache'a TanStack Query.
 * Dzieki hierarchii `["transactions"]` inwaliduje wszystkie strony i filtry naraz.
 */
export const queryKeys = {
  transactions: {
    all: ["transactions"] as const,
    list: (query: Partial<TransactionListQuery>) => ["transactions", "list", query] as const,
  },
  categories: {
    all: ["categories"] as const,
  },
  summary: {
    all: ["summary"] as const,
    byQuery: (query: Record<string, string | undefined>) => ["summary", query] as const,
  },
} as const;

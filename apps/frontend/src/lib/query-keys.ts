/**
 * Jedno miejsce z kluczami cache'a TanStack Query.
 * Dzieki hierarchii `["summary"]` inwaliduje wszystkie warianty podsumowania naraz.
 */
export const queryKeys = {
  categories: {
    all: ["categories"] as const,
  },
  summary: {
    all: ["summary"] as const,
    byQuery: (query: Record<string, string | undefined>) => ["summary", query] as const,
  },
} as const;

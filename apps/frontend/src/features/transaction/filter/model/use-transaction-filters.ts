"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { transactionTypeSchema, type TransactionType } from "@expence/types";
import type { TransactionListParams } from "@/entities/transaction";
import { endOfDayIso, startOfDayIso } from "@/lib/date";

export const TRANSACTIONS_PER_PAGE = 10;

const FILTER_KEYS = ["type", "categoryId", "dateFrom", "dateTo"] as const;
export type TransactionFilterKey = (typeof FILTER_KEYS)[number];

/** Daty jako "YYYY-MM-DD" - dokladnie to, co trzyma <input type="date"> i URL. */
export type TransactionFilterState = {
  type?: TransactionType;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
};

function parseFilters(params: URLSearchParams): TransactionFilterState {
  const type = transactionTypeSchema.safeParse(params.get("type"));
  const page = Number(params.get("page"));

  return {
    type: type.success ? type.data : undefined,
    categoryId: params.get("categoryId") || undefined,
    dateFrom: params.get("dateFrom") || undefined,
    dateTo: params.get("dateTo") || undefined,
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/** Filtry z URL -> parametry API: dni z inputow zamieniamy na granice dnia w ISO. */
export function toListParams(filters: TransactionFilterState): TransactionListParams {
  return {
    type: filters.type,
    categoryId: filters.categoryId,
    dateFrom: startOfDayIso(filters.dateFrom),
    dateTo: endOfDayIso(filters.dateTo),
    page: filters.page,
    perPage: TRANSACTIONS_PER_PAGE,
  };
}

/**
 * Filtry i strona listy transakcji trzymane w URL - przetrwaja odswiezenie,
 * a filtry, podsumowanie i tabela czytaja je niezaleznie bez wspolnego stanu.
 */
export function useTransactionFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters = useMemo(
    () => parseFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const update = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams.toString());
      mutate(next);
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const setFilter = useCallback(
    (key: TransactionFilterKey, value: string | undefined) =>
      update((params) => {
        if (value) params.set(key, value);
        else params.delete(key);
        // Zmiana filtra zmienia liczbe wynikow - wracamy na pierwsza strone.
        params.delete("page");
      }),
    [update],
  );

  const setPage = useCallback(
    (page: number) =>
      update((params) => {
        if (page > 1) params.set("page", String(page));
        else params.delete("page");
      }),
    [update],
  );

  const reset = useCallback(() => update((params) => {
    for (const key of [...FILTER_KEYS, "page"]) params.delete(key);
  }), [update]);

  const hasActiveFilters = FILTER_KEYS.some((key) => filters[key] !== undefined);

  return { filters, setFilter, setPage, reset, hasActiveFilters };
}

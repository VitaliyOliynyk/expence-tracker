"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  transactionListQuerySchema,
  transactionTypeSchema,
  type TransactionType,
} from "@expence/types";
import type { TransactionListParams } from "@/entities/transaction";
import { endOfDayIso, isDateInput, startOfDayIso } from "@/lib/date";

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

/** Data z URL albo undefined - nieaktualny lub recznie zmieniony link nie moze wywolac 400. */
function parseDateParam(value: string | null): string | undefined {
  return value && isDateInput(value) ? value : undefined;
}

function parseFilters(params: URLSearchParams): TransactionFilterState {
  const type = transactionTypeSchema.safeParse(params.get("type"));
  // Ta sama regula co w backendzie (UUID) - wprost ze schematu kontraktu.
  const categoryId = transactionListQuerySchema.shape.categoryId.safeParse(
    params.get("categoryId") || undefined,
  );
  const page = Number(params.get("page"));

  return {
    type: type.success ? type.data : undefined,
    categoryId: categoryId.success ? categoryId.data : undefined,
    dateFrom: parseDateParam(params.get("dateFrom")),
    dateTo: parseDateParam(params.get("dateTo")),
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/**
 * "Od" pozniej niz "Do" - min/max inputow ogranicza tylko kalendarz, nie
 * wpisywanie z klawiatury ani URL. Porownanie napisow YYYY-MM-DD wystarcza.
 */
export function isDateRangeInverted(filters: TransactionFilterState): boolean {
  return Boolean(filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo);
}

/**
 * Filtry z URL -> parametry API: dni z inputow zamieniamy na granice dnia w ISO.
 * Odwrocony zakres zamieniamy miejscami, bo backend odrzuca go jako 400 -
 * inputy zostaja bez zmian, filtry pokazuja o tym podpowiedz.
 */
export function toListParams(filters: TransactionFilterState): TransactionListParams {
  const [dateFrom, dateTo] = isDateRangeInverted(filters)
    ? [filters.dateTo, filters.dateFrom]
    : [filters.dateFrom, filters.dateTo];

  return {
    type: filters.type,
    categoryId: filters.categoryId,
    dateFrom: startOfDayIso(dateFrom),
    dateTo: endOfDayIso(dateTo),
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

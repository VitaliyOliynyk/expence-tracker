"use client";

import { formatAmount } from "@expence/types";
import { toListParams, useTransactionFilters } from "@/features/transaction/filter";
import { useSummary } from "@/hooks/use-summary";
import { cn } from "@/lib/utils";

/**
 * Ciemny panel z sumami po kategoriach dla okresu z filtrow (`/api/summary`).
 * Sledzi filtr typu (domyslnie wydatki), ale celowo ignoruje filtr kategorii -
 * ma pokazywac porownanie wszystkich. Wiersz to przelacznik filtra kategorii
 * listy obok; wybrana kategoria jest podswietlona.
 */
export function CategoryBreakdown() {
  const { filters, setFilter } = useTransactionFilters();
  // toListParams zamienia dni na granice w ISO i odwraca odwrocony zakres (inaczej 400).
  const { dateFrom, dateTo } = toListParams(filters);
  const type = filters.type ?? "EXPENSE";
  const summary = useSummary({ type, dateFrom, dateTo, groupBy: "category" });
  const title = type === "INCOME" ? "Przychody wg kategorii" : "Wydatki wg kategorii";

  return (
    <section
      aria-labelledby="breakdown-heading"
      className="rounded-[2rem] bg-ink p-6 text-white shadow-[0_32px_64px_-32px_rgb(23_21_31/0.55)] xl:sticky xl:top-10 xl:-mr-14"
    >
      <h2 id="breakdown-heading" className="px-3 text-lg font-bold tracking-tight">
        {title}
      </h2>

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-5 px-3 pb-2 text-sm text-white/60">
        <span>Kategoria</span>
        <span className="text-right">Ilosc</span>
        <span className="text-right">Suma</span>
      </div>

      {summary.isError ? (
        <p className="px-3 py-2 text-sm text-white/70">{summary.error.message}</p>
      ) : !summary.data ? (
        <div className="flex flex-col gap-2 py-1">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-10 animate-pulse rounded-full bg-white/8" />
          ))}
        </div>
      ) : summary.data.buckets.length === 0 ? (
        <p className="px-3 py-3 text-sm text-white/70">Brak transakcji w tym okresie.</p>
      ) : (
        <>
          <ul className="flex flex-col gap-0.5">
            {summary.data.buckets.map((bucket) => {
              const isSelected = filters.categoryId === bucket.key;
              return (
                <li key={bucket.key}>
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setFilter("categoryId", isSelected ? undefined : bucket.key)}
                    className={cn(
                      "grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-5 rounded-full px-3 py-2.5 text-left text-sm transition-colors outline-none hover:bg-white/8 focus-visible:ring-2 focus-visible:ring-white/50",
                      isSelected && "bg-ink-raised hover:bg-ink-raised",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: bucket.color ?? undefined }}
                      />
                      <span className="truncate">{bucket.label}</span>
                    </span>
                    <span className="text-right text-white/70 tabular-nums">{bucket.count}</span>
                    <span className="text-right font-semibold tabular-nums">
                      {formatAmount(bucket.totalCents)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-white/10 px-3 pt-4 text-sm">
            <span className="text-white/60">Razem</span>
            <span className="font-bold tabular-nums">{formatAmount(summary.data.totalCents)}</span>
          </div>
        </>
      )}
    </section>
  );
}

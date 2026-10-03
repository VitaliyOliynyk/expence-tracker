"use client";

import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Scale, type LucideIcon } from "lucide-react";
import { formatAmount } from "@expence/types";
import { useTransactions } from "@/entities/transaction";
import {
  toListParams,
  useTransactionFilters,
  type TransactionFilterState,
} from "@/features/transaction/filter";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type SummaryCard = {
  label: string;
  icon: LucideIcon;
  valueCents: number | undefined;
  caption: ReactNode;
  /** Pastelowe tlo karty - ten sam kolor co ikona typu w tabeli. */
  className: string;
};

/** "YYYY-MM-DD" z filtra -> "dd.mm.rrrr"; parsujemy jak date lokalna (poludnie), nie UTC. */
function formatFilterDate(value: string): string {
  return formatDate(`${value}T12:00:00`);
}

function periodLabel({ dateFrom, dateTo }: TransactionFilterState): string {
  if (dateFrom && dateTo) return `${formatFilterDate(dateFrom)} – ${formatFilterDate(dateTo)}`;
  if (dateFrom) return `od ${formatFilterDate(dateFrom)}`;
  if (dateTo) return `do ${formatFilterDate(dateTo)}`;
  return "Caly okres";
}

/** Udzial w przychodach w procentach; null, gdy przychodow brak (dzielenie przez zero). */
function shareOfIncome(cents: number, incomeCents: number): number | null {
  return incomeCents > 0 ? Math.round((cents / incomeCents) * 100) : null;
}

function ShareCaption({ share, suffix }: { share: number | null; suffix: string }) {
  if (share === null) return <>Brak przychodow w okresie</>;
  return (
    <>
      <strong className="font-bold text-foreground tabular-nums">{share}%</strong> {suffix}
    </>
  );
}

/**
 * Przychody, wydatki i saldo dla wybranego okresu i kategorii. Korzysta z tego
 * samego zapytania co tabela (ten sam klucz cache), wiec nie doklada requestu.
 */
export function TransactionsSummary() {
  const { filters } = useTransactionFilters();
  const transactions = useTransactions(toListParams(filters));
  const totals = transactions.data?.totals;
  const balance = totals ? totals.incomeCents - totals.expenseCents : undefined;

  const cards: SummaryCard[] = [
    {
      label: "Przychody",
      icon: ArrowUpRight,
      valueCents: totals?.incomeCents,
      caption: periodLabel(filters),
      className: "bg-mint",
    },
    {
      label: "Wydatki",
      icon: ArrowDownRight,
      valueCents: totals?.expenseCents,
      caption: totals ? (
        <ShareCaption
          share={shareOfIncome(totals.expenseCents, totals.incomeCents)}
          suffix="przychodow"
        />
      ) : null,
      className: "bg-peach",
    },
    {
      label: "Saldo",
      icon: Scale,
      valueCents: balance,
      caption:
        totals && balance !== undefined ? (
          balance < 0 ? (
            "Wydatki przewyzszaja przychody"
          ) : (
            <ShareCaption
              share={shareOfIncome(balance, totals.incomeCents)}
              suffix="przychodow zostaje"
            />
          )
        ) : null,
      className: "bg-periwinkle",
    },
  ];

  return (
    <section aria-label="Podsumowanie okresu" className="grid gap-4 sm:grid-cols-3 sm:gap-5">
      {cards.map(({ label, icon: Icon, valueCents, caption, className }) => (
        <div key={label} className={cn("flex flex-col gap-5 rounded-[1.75rem] p-6", className)}>
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-ink text-white">
              <Icon className="size-5" strokeWidth={2} />
            </span>
            <h2 className="font-semibold">{label}</h2>
          </div>
          <div className="flex flex-col gap-1">
            {valueCents !== undefined ? (
              <p
                className={cn(
                  "text-[1.875rem] leading-none font-bold tracking-tight tabular-nums",
                  valueCents < 0 && "text-destructive",
                )}
              >
                {formatAmount(valueCents)}
              </p>
            ) : transactions.isError ? (
              // Blad pokazuje tabela - tu tylko nie udajemy, ze wciaz ladujemy.
              <p className="text-[1.875rem] leading-none font-bold text-muted-foreground">—</p>
            ) : (
              <Skeleton className="h-[1.875rem] w-36 bg-white/60" />
            )}
            <p className="min-h-5 text-sm text-muted-foreground">{caption}</p>
          </div>
        </div>
      ))}
    </section>
  );
}

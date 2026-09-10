"use client";

import { Scale, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { formatAmount } from "@expence/types";
import { useTransactions } from "@/entities/transaction";
import { toListParams, useTransactionFilters } from "@/features/transaction/filter";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type SummaryCard = {
  label: string;
  icon: LucideIcon;
  valueCents: number | undefined;
  className: string;
};

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
      icon: TrendingUp,
      valueCents: totals?.incomeCents,
      className: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Wydatki",
      icon: TrendingDown,
      valueCents: totals?.expenseCents,
      className: "text-red-600 dark:text-red-400",
    },
    {
      label: "Saldo",
      icon: Scale,
      valueCents: balance,
      className: balance !== undefined && balance < 0 ? "text-red-600 dark:text-red-400" : "",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map(({ label, icon: Icon, valueCents, className }) => (
        <Card key={label} className="gap-2 py-4">
          <CardHeader className="flex flex-row items-center justify-between px-4">
            <CardDescription>{label}</CardDescription>
            <Icon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4">
            {valueCents !== undefined ? (
              <p className={cn("text-2xl font-semibold tabular-nums", className)}>
                {formatAmount(valueCents)}
              </p>
            ) : transactions.isError ? (
              // Blad pokazuje tabela - tu tylko nie udajemy, ze wciaz ladujemy.
              <p className="text-2xl font-semibold text-muted-foreground">—</p>
            ) : (
              <Skeleton className="h-8 w-32" />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { ChevronLeft, ChevronRight, Pencil, Receipt } from "lucide-react";
import type { TransactionDto } from "@expence/types";
import { TransactionAmount, TransactionTypeIcon, useTransactions } from "@/entities/transaction";
import { DeleteTransactionButton } from "@/features/transaction/delete";
import { toListParams, useTransactionFilters } from "@/features/transaction/filter";
import { TransactionFormDialog } from "@/features/transaction/upsert";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function TransactionsTable() {
  const { filters, setPage, reset, hasActiveFilters } = useTransactionFilters();
  const transactions = useTransactions(toListParams(filters));
  const data = transactions.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.perPage)) : 1;
  const isOutOfRange =
    !!data && !transactions.isPlaceholderData && data.items.length === 0 && filters.page > 1;

  // Strona poza zakresem (np. po usunieciu ostatniego wiersza na ostatniej
  // stronie albo recznie wpisanym ?page=) - przechodzimy na ostatnia istniejaca.
  useEffect(() => {
    if (isOutOfRange) setPage(totalPages);
  }, [isOutOfRange, setPage, totalPages]);

  if (transactions.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{transactions.error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!data || isOutOfRange) return <TableSkeleton />;

  if (data.total === 0) {
    return <EmptyState hasActiveFilters={hasActiveFilters} onReset={reset} />;
  }

  const from = (data.page - 1) * data.perPage + 1;
  const to = from + data.items.length - 1;

  return (
    <div className="flex flex-col gap-4">
      <div className={cn("transition-opacity", transactions.isPlaceholderData && "opacity-60")}>
        <Table>
          <TableHeader className="[&_tr]:border-b-0">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-14 pl-0">
                <span className="sr-only">Typ</span>
              </TableHead>
              <TableHead className="font-normal text-muted-foreground">Opis</TableHead>
              <TableHead className="hidden font-normal text-muted-foreground md:table-cell">
                Kategoria
              </TableHead>
              <TableHead className="hidden font-normal text-muted-foreground sm:table-cell">
                Data
              </TableHead>
              <TableHead className="text-right font-normal text-muted-foreground">Kwota</TableHead>
              <TableHead className="w-20 pr-0">
                <span className="sr-only">Akcje</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((transaction) => (
              <TransactionRow key={transaction.id} transaction={transaction} />
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
        <span className="tabular-nums">
          {from}–{to} z {data.total}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Poprzednia strona"
            disabled={data.page <= 1}
            onClick={() => setPage(data.page - 1)}
          >
            <ChevronLeft />
          </Button>
          <span className="px-2 tabular-nums">
            Strona {data.page} z {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            aria-label="Nastepna strona"
            disabled={data.page >= totalPages}
            onClick={() => setPage(data.page + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}

function CategoryLabel({ category }: { category: TransactionDto["category"] }) {
  return (
    <span className="inline-flex items-center gap-2 text-muted-foreground">
      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
      {category.name}
    </span>
  );
}

function TransactionRow({ transaction }: { transaction: TransactionDto }) {
  return (
    <TableRow className="border-b-0">
      <TableCell className="py-3 pl-0">
        <TransactionTypeIcon type={transaction.type} />
      </TableCell>
      <TableCell className="max-w-64 py-3">
        <div className="flex flex-col items-start gap-0.5">
          <span
            className={cn(
              "max-w-full truncate font-medium",
              !transaction.description && "font-normal text-muted-foreground",
            )}
          >
            {transaction.description || "Bez opisu"}
          </span>
          <span className="flex flex-wrap gap-x-3 text-xs md:hidden">
            <CategoryLabel category={transaction.category} />
            <span className="text-muted-foreground tabular-nums sm:hidden">
              {formatDate(transaction.date)}
            </span>
          </span>
        </div>
      </TableCell>
      <TableCell className="hidden py-3 md:table-cell">
        <CategoryLabel category={transaction.category} />
      </TableCell>
      <TableCell className="hidden py-3 text-muted-foreground tabular-nums sm:table-cell">
        {formatDate(transaction.date)}
      </TableCell>
      <TableCell className="py-3 text-right">
        <TransactionAmount amountCents={transaction.amountCents} type={transaction.type} />
      </TableCell>
      <TableCell className="py-3 pr-0">
        <div className="flex justify-end gap-0.5">
          <TransactionFormDialog
            transaction={transaction}
            trigger={
              <Button variant="ghost" size="icon-sm" aria-label="Edytuj transakcje">
                <Pencil />
              </Button>
            }
          />
          <DeleteTransactionButton transaction={transaction} />
        </div>
      </TableCell>
    </TableRow>
  );
}

function TableSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="flex items-center gap-4">
          <Skeleton className="size-10 rounded-full" />
          <Skeleton className="h-5 flex-1" />
          <Skeleton className="h-5 w-24" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  hasActiveFilters,
  onReset,
}: {
  hasActiveFilters: boolean;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-[1.75rem] bg-sidebar px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-background text-muted-foreground">
        <Receipt className="size-5" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="font-semibold">Brak transakcji</p>
        <p className="text-sm text-muted-foreground">
          {hasActiveFilters
            ? "Zadna transakcja nie pasuje do wybranych filtrow."
            : "Dodaj pierwsza transakcje przyciskiem „Nowa transakcja”."}
        </p>
      </div>
      {hasActiveFilters ? (
        <Button variant="outline" size="sm" onClick={onReset}>
          Wyczysc filtry
        </Button>
      ) : null}
    </div>
  );
}

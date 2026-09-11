"use client";

import { useEffect } from "react";
import { ChevronLeft, ChevronRight, Pencil, Receipt } from "lucide-react";
import type { TransactionDto } from "@expence/types";
import { TransactionAmount, useTransactions } from "@/entities/transaction";
import { DeleteTransactionButton } from "@/features/transaction/delete";
import { toListParams, useTransactionFilters } from "@/features/transaction/filter";
import { TransactionFormDialog } from "@/features/transaction/upsert";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
      <div
        className={cn(
          "overflow-hidden rounded-lg border bg-card transition-opacity",
          transactions.isPlaceholderData && "opacity-60",
        )}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28 pl-4">Data</TableHead>
              <TableHead>Opis</TableHead>
              <TableHead className="hidden md:table-cell">Kategoria</TableHead>
              <TableHead className="text-right">Kwota</TableHead>
              <TableHead className="w-24 pr-4">
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
            size="sm"
            disabled={data.page <= 1}
            onClick={() => setPage(data.page - 1)}
          >
            <ChevronLeft />
            Poprzednia
          </Button>
          <span className="px-2 tabular-nums">
            Strona {data.page} z {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={data.page >= totalPages}
            onClick={() => setPage(data.page + 1)}
          >
            Nastepna
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}

function CategoryBadge({ category }: { category: TransactionDto["category"] }) {
  return (
    <Badge variant="outline" className="gap-1.5 font-normal">
      <span className="size-2 rounded-full" style={{ backgroundColor: category.color }} />
      {category.name}
    </Badge>
  );
}

function TransactionRow({ transaction }: { transaction: TransactionDto }) {
  return (
    <TableRow>
      <TableCell className="pl-4 text-muted-foreground tabular-nums">
        {formatDate(transaction.date)}
      </TableCell>
      <TableCell className="max-w-64">
        <div className="flex flex-col items-start gap-1">
          <span className={cn("truncate", !transaction.description && "text-muted-foreground")}>
            {transaction.description || "Bez opisu"}
          </span>
          <span className="md:hidden">
            <CategoryBadge category={transaction.category} />
          </span>
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <CategoryBadge category={transaction.category} />
      </TableCell>
      <TableCell className="text-right">
        <TransactionAmount amountCents={transaction.amountCents} type={transaction.type} />
      </TableCell>
      <TableCell className="pr-4">
        <div className="flex justify-end gap-1">
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
    <div className="flex flex-col gap-2 rounded-lg border bg-card p-4">
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
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
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-card px-6 py-12 text-center">
      <Receipt className="size-8 text-muted-foreground" />
      <div>
        <p className="font-medium">Brak transakcji</p>
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

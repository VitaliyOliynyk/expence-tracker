"use client";

import { formatAmount } from "@expence/types";
import { useDeleteExpense, useExpenses } from "@/hooks/use-expenses";

export function ExpenseList() {
  const expenses = useExpenses({ perPage: 25 });
  const deleteExpense = useDeleteExpense();

  if (expenses.isPending) return <p className="text-sm text-muted-foreground">Ladowanie...</p>;
  if (expenses.isError) return <p className="text-sm text-destructive">{expenses.error.message}</p>;
  if (expenses.data.items.length === 0) {
    return <p className="text-sm text-muted-foreground">Brak wydatkow.</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {expenses.data.items.map((expense) => (
        <li key={expense.id} className="flex items-center gap-3 py-3 text-sm">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: expense.category?.color ?? "transparent" }}
          />
          <span className="flex-1">{expense.description ?? "Bez opisu"}</span>
          <span className="text-muted-foreground">
            {new Date(expense.spentAt).toLocaleDateString("pl-PL")}
          </span>
          <span className="font-medium">{formatAmount(expense.amountCents, expense.currency)}</span>
          <button
            type="button"
            onClick={() => deleteExpense.mutate(expense.id)}
            className="text-muted-foreground hover:text-destructive"
          >
            Usun
          </button>
        </li>
      ))}
    </ul>
  );
}

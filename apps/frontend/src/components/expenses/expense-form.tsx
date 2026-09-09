"use client";

import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import {
  createExpenseSchema,
  type CreateExpenseFormValues,
  type CreateExpenseInput,
} from "@expence/types";
import { useCategories } from "@/hooks/use-categories";
import { useCreateExpense } from "@/hooks/use-expenses";

/**
 * Szkielet formularza. Ten sam schemat Zod waliduje tu i w backendzie
 * (packages/types) - nie ma dwoch rownoleglych definicji regul.
 */
export function ExpenseForm() {
  const categories = useCategories();
  const createExpense = useCreateExpense();

  // Trzeci parametr generyka: typ PO transformacji Zod (kwota juz w groszach).
  const form = useForm<CreateExpenseFormValues, unknown, CreateExpenseInput>({
    resolver: standardSchemaResolver(createExpenseSchema),
    defaultValues: {
      currency: "PLN",
      spentAt: new Date().toISOString(),
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await createExpense.mutateAsync(values);
    form.reset();
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <input
        {...form.register("amount")}
        placeholder="Kwota (np. 42,90)"
        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
      <input
        {...form.register("description")}
        placeholder="Opis"
        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
      <select
        {...form.register("categoryId")}
        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="">Bez kategorii</option>
        {categories.data?.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>

      {form.formState.errors.amount ? (
        <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>
      ) : null}

      <button
        type="submit"
        disabled={createExpense.isPending}
        className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {createExpense.isPending ? "Zapisywanie..." : "Dodaj wydatek"}
      </button>
    </form>
  );
}

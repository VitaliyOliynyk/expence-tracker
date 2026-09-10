"use client";

import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import {
  createCategorySchema,
  type CategoryDto,
  type CreateCategoryFormValues,
  type CreateCategoryInput,
} from "@expence/types";
import { useCreateCategory, useUpdateCategory } from "@/hooks/use-categories";

type CategoryFormProps = {
  category?: CategoryDto;
  onSuccess?: () => void;
};

export function CategoryForm({ category, onSuccess }: CategoryFormProps) {
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory(category?.id ?? "");
  const mutation = category ? updateCategory : createCategory;

  // Trzeci parametr generyka: typ PO walidacji Zod (color ma juz default wypelniony).
  const form = useForm<CreateCategoryFormValues, unknown, CreateCategoryInput>({
    resolver: standardSchemaResolver(createCategorySchema),
    defaultValues: {
      name: category?.name ?? "",
      color: category?.color ?? "#64748b",
      icon: category?.icon ?? "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await mutation.mutateAsync(values);
    if (!category) form.reset();
    onSuccess?.();
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <input
        {...form.register("name")}
        placeholder="Nazwa kategorii"
        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
      <input
        {...form.register("color")}
        type="color"
        className="h-9 w-16 rounded-md border border-input bg-background"
      />
      <input
        {...form.register("icon")}
        placeholder="Ikona (opcjonalnie)"
        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
      />

      {form.formState.errors.name ? (
        <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
      ) : null}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {mutation.isPending ? "Zapisywanie..." : category ? "Zapisz zmiany" : "Dodaj kategorie"}
      </button>
    </form>
  );
}

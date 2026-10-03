"use client";

import { useId } from "react";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import {
  createCategorySchema,
  type CategoryDto,
  type CreateCategoryFormValues,
  type CreateCategoryInput,
} from "@expence/types";
import { useCreateCategory, useUpdateCategory } from "@/hooks/use-categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CategoryFormProps = {
  category?: CategoryDto;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function CategoryForm({ category, onSuccess, onCancel }: CategoryFormProps) {
  const id = useId();
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

  const nameError = form.formState.errors.name;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex items-end gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-color`}>Kolor</Label>
          <input
            id={`${id}-color`}
            {...form.register("color")}
            type="color"
            className="h-10 w-12 cursor-pointer rounded-lg border border-input bg-background p-1 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Label htmlFor={`${id}-name`}>Nazwa</Label>
          <Input
            id={`${id}-name`}
            {...form.register("name")}
            placeholder="np. Zakupy"
            className="h-10 bg-background"
            aria-invalid={nameError ? true : undefined}
            aria-describedby={nameError ? `${id}-name-error` : undefined}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-icon`}>Ikona (opcjonalnie)</Label>
        <Input
          id={`${id}-icon`}
          {...form.register("icon")}
          placeholder="np. wallet"
          className="h-10 bg-background"
        />
      </div>

      {nameError ? (
        <p id={`${id}-name-error`} className="text-sm text-destructive">
          {nameError.message}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" size="lg" className="flex-1" disabled={mutation.isPending}>
          {mutation.isPending ? "Zapisywanie..." : category ? "Zapisz zmiany" : "Dodaj kategorie"}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" size="lg" onClick={onCancel}>
            Anuluj
          </Button>
        ) : null}
      </div>
    </form>
  );
}

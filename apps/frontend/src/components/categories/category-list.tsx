"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useCategories, useDeleteCategory } from "@/hooks/use-categories";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryForm } from "./category-form";

export function CategoryList() {
  const categories = useCategories();
  const deleteCategory = useDeleteCategory();
  const [editingId, setEditingId] = useState<string | null>(null);

  if (categories.isPending) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-12 w-full rounded-full" />
        ))}
      </div>
    );
  }
  if (categories.isError)
    return <p className="text-sm text-destructive">{categories.error.message}</p>;
  if (categories.data.length === 0) {
    return (
      <p className="rounded-[1.75rem] bg-sidebar px-6 py-10 text-center text-sm text-muted-foreground">
        Brak kategorii. Dodaj pierwsza w formularzu obok.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-1">
      {categories.data.map((category) =>
        editingId === category.id ? (
          <li key={category.id} className="rounded-[1.5rem] bg-sidebar p-5">
            <CategoryForm
              category={category}
              onSuccess={() => setEditingId(null)}
              onCancel={() => setEditingId(null)}
            />
          </li>
        ) : (
          <li
            key={category.id}
            className="flex items-center gap-4 rounded-2xl py-2 pr-1 pl-0 text-sm"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary">
              <span className="size-3 rounded-full" style={{ backgroundColor: category.color }} />
            </span>
            <span className="min-w-0 flex-1 truncate font-medium">{category.name}</span>
            {category.icon ? (
              <span className="hidden text-muted-foreground sm:inline">{category.icon}</span>
            ) : null}
            <div className="flex gap-0.5">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Edytuj kategorie ${category.name}`}
                onClick={() => setEditingId(category.id)}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Usun kategorie ${category.name}`}
                onClick={() => deleteCategory.mutate(category.id)}
              >
                <Trash2 />
              </Button>
            </div>
          </li>
        ),
      )}
    </ul>
  );
}

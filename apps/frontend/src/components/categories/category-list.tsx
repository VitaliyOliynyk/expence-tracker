"use client";

import { useState } from "react";
import { useCategories, useDeleteCategory } from "@/hooks/use-categories";
import { CategoryForm } from "./category-form";

export function CategoryList() {
  const categories = useCategories();
  const deleteCategory = useDeleteCategory();
  const [editingId, setEditingId] = useState<string | null>(null);

  if (categories.isPending) return <p className="text-sm text-muted-foreground">Ladowanie...</p>;
  if (categories.isError) return <p className="text-sm text-destructive">{categories.error.message}</p>;
  if (categories.data.length === 0) {
    return <p className="text-sm text-muted-foreground">Brak kategorii.</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {categories.data.map((category) =>
        editingId === category.id ? (
          <li key={category.id} className="py-3">
            <CategoryForm category={category} onSuccess={() => setEditingId(null)} />
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="mt-2 text-sm text-muted-foreground hover:underline"
            >
              Anuluj
            </button>
          </li>
        ) : (
          <li key={category.id} className="flex items-center gap-3 py-3 text-sm">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: category.color }}
            />
            <span className="flex-1">{category.name}</span>
            {category.icon ? <span className="text-muted-foreground">{category.icon}</span> : null}
            <button
              type="button"
              onClick={() => setEditingId(category.id)}
              className="text-muted-foreground hover:text-foreground"
            >
              Edytuj
            </button>
            <button
              type="button"
              onClick={() => deleteCategory.mutate(category.id)}
              className="text-muted-foreground hover:text-destructive"
            >
              Usun
            </button>
          </li>
        ),
      )}
    </ul>
  );
}

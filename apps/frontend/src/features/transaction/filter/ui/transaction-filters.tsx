"use client";

import { useId, type ReactNode } from "react";
import { X } from "lucide-react";
import { TRANSACTION_TYPES } from "@expence/types";
import { useCategories } from "@/hooks/use-categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTransactionFilters } from "../model/use-transaction-filters";

// Radix Select nie przyjmuje pustej wartosci w SelectItem - "wszystkie" to osobny znacznik.
const ALL = "all";

const TYPE_FILTER_LABELS = { INCOME: "Przychody", EXPENSE: "Wydatki" } as const;

function FilterField({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-36 flex-1 flex-col gap-1.5 sm:flex-none">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

export function TransactionFilters() {
  const id = useId();
  const categories = useCategories();
  const { filters, setFilter, reset, hasActiveFilters } = useTransactionFilters();

  return (
    <div className="flex flex-wrap items-end gap-3">
      <FilterField id={`${id}-type`} label="Typ">
        <Select
          value={filters.type ?? ALL}
          onValueChange={(value) => setFilter("type", value === ALL ? undefined : value)}
        >
          <SelectTrigger id={`${id}-type`} className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Wszystkie</SelectItem>
            {TRANSACTION_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {TYPE_FILTER_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField id={`${id}-category`} label="Kategoria">
        <Select
          value={filters.categoryId ?? ALL}
          onValueChange={(value) => setFilter("categoryId", value === ALL ? undefined : value)}
        >
          <SelectTrigger id={`${id}-category`} className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Wszystkie kategorie</SelectItem>
            {categories.data?.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                <span className="size-2 rounded-full" style={{ backgroundColor: category.color }} />
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField id={`${id}-from`} label="Od">
        <Input
          id={`${id}-from`}
          type="date"
          className="sm:w-40"
          value={filters.dateFrom ?? ""}
          max={filters.dateTo}
          onChange={(event) => setFilter("dateFrom", event.target.value || undefined)}
        />
      </FilterField>

      <FilterField id={`${id}-to`} label="Do">
        <Input
          id={`${id}-to`}
          type="date"
          className="sm:w-40"
          value={filters.dateTo ?? ""}
          min={filters.dateFrom}
          onChange={(event) => setFilter("dateTo", event.target.value || undefined)}
        />
      </FilterField>

      {hasActiveFilters ? (
        <Button variant="ghost" onClick={reset}>
          <X />
          Wyczysc filtry
        </Button>
      ) : null}
    </div>
  );
}

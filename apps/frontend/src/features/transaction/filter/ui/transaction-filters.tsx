"use client";

import { useId, type ReactNode } from "react";
import { X } from "lucide-react";
import { TRANSACTION_TYPES } from "@expence/types";
import { useCategories } from "@/hooks/use-categories";
import { cn } from "@/lib/utils";
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
import { isDateRangeInverted, useTransactionFilters } from "../model/use-transaction-filters";

// Radix Select nie przyjmuje pustej wartosci w SelectItem - "wszystkie" to osobny znacznik.
const ALL = "all";

const TYPE_FILTER_LABELS = { INCOME: "Przychody", EXPENSE: "Wydatki" } as const;

// Wypelnione pola bez obramowania - jak wyszukiwarka i selecty w referencji panelu.
const CONTROL = "h-10 rounded-xl border-transparent bg-secondary shadow-none";

function FilterField({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 basis-36 flex-col gap-1.5">
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
  const rangeInverted = isDateRangeInverted(filters);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-3">
        <FilterField id={`${id}-type`} label="Typ">
          <Select
            value={filters.type ?? ALL}
            onValueChange={(value) => setFilter("type", value === ALL ? undefined : value)}
          >
            <SelectTrigger
              id={`${id}-type`}
              className={cn(CONTROL, "w-full data-[size=default]:h-10")}
            >
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
            <SelectTrigger
              id={`${id}-category`}
              className={cn(CONTROL, "w-full data-[size=default]:h-10")}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Wszystkie kategorie</SelectItem>
              {categories.data?.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
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
            className={CONTROL}
            value={filters.dateFrom ?? ""}
            max={filters.dateTo}
            aria-invalid={rangeInverted || undefined}
            aria-describedby={rangeInverted ? `${id}-range-hint` : undefined}
            onChange={(event) => setFilter("dateFrom", event.target.value || undefined)}
          />
        </FilterField>

        <FilterField id={`${id}-to`} label="Do">
          <Input
            id={`${id}-to`}
            type="date"
            className={CONTROL}
            value={filters.dateTo ?? ""}
            min={filters.dateFrom}
            aria-invalid={rangeInverted || undefined}
            aria-describedby={rangeInverted ? `${id}-range-hint` : undefined}
            onChange={(event) => setFilter("dateTo", event.target.value || undefined)}
          />
        </FilterField>

        {hasActiveFilters ? (
          <Button variant="ghost" className="h-10" onClick={reset}>
            <X />
            Wyczysc filtry
          </Button>
        ) : null}
      </div>

      {rangeInverted ? (
        <p id={`${id}-range-hint`} className="text-xs text-muted-foreground">
          Data &quot;Od&quot; jest pozniejsza niz &quot;Do&quot; - pokazujemy transakcje z zakresu
          odwroconego.
        </p>
      ) : null}
    </div>
  );
}

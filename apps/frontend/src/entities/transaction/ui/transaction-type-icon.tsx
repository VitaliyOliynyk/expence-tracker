import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { TransactionType } from "@expence/types";
import { cn } from "@/lib/utils";
import { TRANSACTION_TYPE_LABELS } from "../model/labels";

/** Okragly znacznik typu: mieta i strzalka w gore dla przychodu, brzoskwinia i w dol dla wydatku. */
export function TransactionTypeIcon({
  type,
  className,
}: {
  type: TransactionType;
  className?: string;
}) {
  const isIncome = type === "INCOME";
  const Icon = isIncome ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      role="img"
      aria-label={TRANSACTION_TYPE_LABELS[type]}
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full",
        isIncome ? "bg-mint text-mint-ink" : "bg-peach text-peach-ink",
        className,
      )}
    >
      <Icon className="size-[1.125rem]" strokeWidth={2} />
    </span>
  );
}

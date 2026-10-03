import { formatAmount, type TransactionType } from "@expence/types";
import { cn } from "@/lib/utils";

type TransactionAmountProps = {
  amountCents: number;
  type: TransactionType;
  className?: string;
};

/** Kwota ze znakiem wynikajacym z typu - w bazie `amountCents` jest zawsze dodatnie. */
export function TransactionAmount({ amountCents, type, className }: TransactionAmountProps) {
  const isIncome = type === "INCOME";

  return (
    <span
      className={cn(
        "font-semibold whitespace-nowrap tabular-nums",
        isIncome ? "text-mint-ink" : "text-foreground",
        className,
      )}
    >
      {isIncome ? "+" : "−"}
      {formatAmount(amountCents)}
    </span>
  );
}

import type { Category, Transaction } from "@expence/db";
import type { TransactionDto } from "@expence/types";
import { toCategoryDto } from "../../mappers";

export function toTransactionDto(transaction: Transaction & { category: Category }): TransactionDto {
  return {
    id: transaction.id,
    amountCents: transaction.amountCents,
    type: transaction.type,
    description: transaction.description,
    date: transaction.date.toISOString(),
    category: toCategoryDto(transaction.category),
    createdAt: transaction.createdAt.toISOString(),
  };
}

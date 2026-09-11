import type { Category, Transaction } from "@expence/db";
import type { TransactionDto } from "@expence/types";
import { toCategoryDto } from "../../mappers";

/**
 * Mapuje rekord Prismy (z dociagnieta kategoria) na DTO z kontraktu `@expence/types`.
 * Daty zamienia na ISO 8601, a kwota zostaje w groszach.
 *
 * Nie rzuca wyjatkow - daty z bazy sa zawsze poprawne.
 *
 * @param transaction - transakcja z relacja `category` (`include: { category: true }`).
 * @returns DTO transakcji gotowe do wyslania w odpowiedzi API.
 */
export function toTransactionDto(
  transaction: Transaction & { category: Category },
): TransactionDto {
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

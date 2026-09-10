import type {
  CreateTransactionInput,
  TransactionDto,
  TransactionListQuery,
  UpdateTransactionInput,
} from "@expence/types";
import * as transactionRepository from "./transaction.repository";
import { toTransactionDto } from "./transaction.mapper";
import { TransactionCategoryNotFoundError } from "./transaction.errors";

// Bez tego sprawdzenia uzytkownik moglby podpiac transakcje pod cudza kategorie
// (FK sprawdza tylko istnienie kategorii, nie jej wlasciciela).
async function assertCategoryOwned(userId: string, categoryId: string): Promise<void> {
  if (!(await transactionRepository.categoryBelongsToUser(userId, categoryId))) {
    throw new TransactionCategoryNotFoundError(categoryId);
  }
}

export async function listTransactions(
  userId: string,
  query: TransactionListQuery,
): Promise<TransactionDto[]> {
  const transactions = await transactionRepository.findMany(userId, query);
  return transactions.map(toTransactionDto);
}

export async function getTransaction(userId: string, id: string): Promise<TransactionDto | null> {
  const transaction = await transactionRepository.findById(userId, id);
  return transaction ? toTransactionDto(transaction) : null;
}

export async function createTransaction(
  userId: string,
  input: CreateTransactionInput,
): Promise<TransactionDto> {
  await assertCategoryOwned(userId, input.categoryId);

  const transaction = await transactionRepository.create({
    userId,
    categoryId: input.categoryId,
    // `amount` przyszlo juz przeliczone na grosze przez amountInputSchema.
    amountCents: input.amount,
    type: input.type,
    description: input.description ?? null,
    date: new Date(input.date),
  });
  return toTransactionDto(transaction);
}

export async function updateTransaction(
  userId: string,
  id: string,
  input: UpdateTransactionInput,
): Promise<TransactionDto | null> {
  if (input.categoryId !== undefined) {
    await assertCategoryOwned(userId, input.categoryId);
  }

  const count = await transactionRepository.updateScoped(userId, id, {
    ...(input.amount !== undefined ? { amountCents: input.amount } : {}),
    ...(input.type !== undefined ? { type: input.type } : {}),
    ...(input.description !== undefined ? { description: input.description ?? null } : {}),
    ...(input.date !== undefined ? { date: new Date(input.date) } : {}),
    ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
  });
  if (count === 0) return null;
  return getTransaction(userId, id);
}

export async function deleteTransaction(userId: string, id: string): Promise<boolean> {
  return (await transactionRepository.deleteScoped(userId, id)) > 0;
}

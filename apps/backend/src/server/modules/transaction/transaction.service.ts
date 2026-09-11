import {
  DEFAULT_CURRENCY,
  type CreateTransactionInput,
  type SummaryBucket,
  type SummaryDto,
  type SummaryQuery,
  type TransactionDto,
  type TransactionListQuery,
  type TransactionListResponse,
  type UpdateTransactionInput,
} from "@expence/types";
import * as transactionRepository from "./transaction.repository";
import { toTransactionDto } from "./transaction.mapper";
import { TransactionCategoryNotFoundError } from "./transaction.errors";

// Klucz miesiaca ("YYYY-MM") liczymy w UTC, wiec etykieta tez musi byc w UTC -
// inaczej serwer w strefie za UTC podpisalby "2026-09" jako sierpien.
const MONTH_LABELS = new Intl.DateTimeFormat("pl-PL", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

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
): Promise<TransactionListResponse> {
  const [transactions, total, sums] = await Promise.all([
    transactionRepository.findPage(userId, query),
    transactionRepository.count(userId, query),
    transactionRepository.sumByType(userId, query),
  ]);

  return {
    items: transactions.map(toTransactionDto),
    page: query.page,
    perPage: query.perPage,
    total,
    totals: { incomeCents: sums.INCOME, expenseCents: sums.EXPENSE },
  };
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

async function summarizeByCategory(userId: string, query: SummaryQuery): Promise<SummaryBucket[]> {
  const grouped = await transactionRepository.sumByCategory(userId, query);
  const categories = await transactionRepository.findCategoriesByIds(
    userId,
    grouped.map((row) => row.categoryId),
  );
  const byId = new Map(categories.map((category) => [category.id, category]));

  return grouped
    .map((row) => ({
      key: row.categoryId,
      label: byId.get(row.categoryId)?.name ?? "Nieznana kategoria",
      color: byId.get(row.categoryId)?.color ?? null,
      totalCents: row._sum.amountCents ?? 0,
      count: row._count._all,
    }))
    .sort((a, b) => b.totalCents - a.totalCents);
}

// Prisma nie grupuje po wyrazeniu na dacie, wiec agregujemy w pamieci.
// Przy skali produkcyjnej podmien to na $queryRaw z date_trunc.
async function summarizeByMonth(userId: string, query: SummaryQuery): Promise<SummaryBucket[]> {
  const rows = await transactionRepository.findAmountsByDate(userId, query);

  const totals = new Map<string, { totalCents: number; count: number }>();
  for (const row of rows) {
    const key = row.date.toISOString().slice(0, 7);
    const current = totals.get(key) ?? { totalCents: 0, count: 0 };
    totals.set(key, { totalCents: current.totalCents + row.amountCents, count: current.count + 1 });
  }

  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({
      key,
      label: MONTH_LABELS.format(new Date(`${key}-01T00:00:00.000Z`)),
      color: null,
      totalCents: value.totalCents,
      count: value.count,
    }));
}

export async function getSummary(userId: string, query: SummaryQuery): Promise<SummaryDto> {
  const buckets =
    query.groupBy === "category"
      ? await summarizeByCategory(userId, query)
      : await summarizeByMonth(userId, query);

  return {
    currency: DEFAULT_CURRENCY,
    totalCents: buckets.reduce((sum, bucket) => sum + bucket.totalCents, 0),
    buckets,
  };
}

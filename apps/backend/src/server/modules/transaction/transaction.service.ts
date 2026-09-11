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

/**
 * Logika biznesowa modulu transakcji. Wszystkie funkcje ponizej przepuszczaja
 * bledy Prismy z repozytorium (np. `Prisma.PrismaClientKnownRequestError`) przy
 * problemie z baza danych - route handler zamienia je na `500 INTERNAL`.
 */

// Klucz miesiaca ("YYYY-MM") liczymy w UTC, wiec etykieta tez musi byc w UTC -
// inaczej serwer w strefie za UTC podpisalby "2026-09" jako sierpien.
const MONTH_LABELS = new Intl.DateTimeFormat("pl-PL", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * Sprawdza, czy kategoria nalezy do uzytkownika.
 * Bez tego sprawdzenia uzytkownik moglby podpiac transakcje pod cudza kategorie
 * (FK sprawdza tylko istnienie kategorii, nie jej wlasciciela).
 *
 * @param userId - wlasciciel, ktorego kategorie sprawdzamy.
 * @param categoryId - id kategorii wskazanej w transakcji.
 * @returns Nic - konczy sie normalnie, gdy kategoria nalezy do uzytkownika.
 * @throws {TransactionCategoryNotFoundError} gdy kategorii nie ma albo nalezy
 *   do innego uzytkownika.
 */
async function assertCategoryOwned(userId: string, categoryId: string): Promise<void> {
  if (!(await transactionRepository.categoryBelongsToUser(userId, categoryId))) {
    throw new TransactionCategoryNotFoundError(categoryId);
  }
}

/**
 * Zwraca jedna strone transakcji uzytkownika razem z licznikiem i sumami.
 * Strona, licznik i sumy sa pobierane rownolegle.
 *
 * @param userId - wlasciciel transakcji.
 * @param query - filtry (`dateFrom`, `dateTo`, `type`, `categoryId`) i stronicowanie
 *   (`page`, `perPage`) po walidacji `transactionListQuerySchema`.
 * @returns Strona `items`, `total` pasujacych rekordow i `totals`
 *   (`incomeCents`/`expenseCents`) liczone z filtrami daty i kategorii, ale bez `type`.
 * @throws Blad Prismy przy problemie z baza danych.
 */
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

/**
 * Pobiera pojedyncza transakcje uzytkownika.
 *
 * @param userId - wlasciciel transakcji.
 * @param id - id transakcji.
 * @returns DTO transakcji albo `null`, gdy jej nie ma albo nalezy do innego uzytkownika.
 * @throws Blad Prismy przy problemie z baza danych.
 */
export async function getTransaction(userId: string, id: string): Promise<TransactionDto | null> {
  const transaction = await transactionRepository.findById(userId, id);
  return transaction ? toTransactionDto(transaction) : null;
}

/**
 * Tworzy transakcje po sprawdzeniu, ze kategoria nalezy do uzytkownika.
 *
 * @param userId - wlasciciel nowej transakcji.
 * @param input - dane po `createTransactionSchema`; `amount` jest juz w groszach.
 * @returns Utworzona transakcja jako DTO (z dociagnieta kategoria).
 * @throws {TransactionCategoryNotFoundError} gdy `input.categoryId` nie istnieje
 *   albo nalezy do innego uzytkownika.
 * @throws Blad Prismy przy problemie z baza danych, np. `P2003`, gdy kategoria
 *   zniknie miedzy sprawdzeniem wlasnosci a zapisem.
 */
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

/**
 * Czesciowo aktualizuje transakcje - zmienia tylko pola obecne w `input`.
 * Zmiana kategorii jest sprawdzana pod katem wlasnosci przed zapisem.
 *
 * @param userId - wlasciciel transakcji.
 * @param id - id aktualizowanej transakcji.
 * @param input - dane po `updateTransactionSchema` (wszystkie pola opcjonalne,
 *   `amount` juz w groszach, `description: null` czysci opis).
 * @returns Transakcja po zmianie albo `null`, gdy transakcji nie ma albo nalezy
 *   do innego uzytkownika.
 * @throws {TransactionCategoryNotFoundError} gdy podany `input.categoryId` nie
 *   istnieje albo nalezy do innego uzytkownika (sprawdzane przed wyszukaniem transakcji).
 * @throws Blad Prismy przy problemie z baza danych.
 */
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

/**
 * Usuwa transakcje uzytkownika.
 *
 * @param userId - wlasciciel transakcji.
 * @param id - id usuwanej transakcji.
 * @returns `true` po usunieciu, `false` gdy transakcji nie ma albo nalezy do innego uzytkownika.
 * @throws Blad Prismy przy problemie z baza danych.
 */
export async function deleteTransaction(userId: string, id: string): Promise<boolean> {
  return (await transactionRepository.deleteScoped(userId, id)) > 0;
}

/**
 * Podsumowanie pogrupowane po kategorii, od najwiekszej sumy.
 * Kategoria, ktorej nie udalo sie dociagnac, dostaje etykiete "Nieznana kategoria".
 *
 * @param userId - wlasciciel transakcji.
 * @param query - `type` i zakres dat po walidacji `summaryQuerySchema`.
 * @returns Koszyki z `key` = id kategorii, jej nazwa i kolorem, suma i liczba transakcji.
 * @throws Blad Prismy przy problemie z baza danych.
 */
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

/**
 * Podsumowanie pogrupowane po miesiacu (UTC), chronologicznie.
 * Prisma nie grupuje po wyrazeniu na dacie, wiec agregujemy w pamieci.
 * Przy skali produkcyjnej podmien to na $queryRaw z date_trunc.
 *
 * @param userId - wlasciciel transakcji.
 * @param query - `type` i zakres dat po walidacji `summaryQuerySchema`.
 * @returns Koszyki z `key` = "YYYY-MM", etykieta typu "wrzesien 2026", suma i liczba transakcji.
 * @throws Blad Prismy przy problemie z baza danych.
 */
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

/**
 * Podsumowanie transakcji jednego typu w zadanym okresie, pogrupowane wg `query.groupBy`.
 *
 * @param userId - wlasciciel transakcji.
 * @param query - `type` (domyslnie `EXPENSE`), `groupBy` (`category` | `month`)
 *   i opcjonalny zakres dat, po walidacji `summaryQuerySchema`.
 * @returns Waluta domyslna, suma wszystkich koszykow i same koszyki.
 * @throws Blad Prismy przy problemie z baza danych.
 */
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

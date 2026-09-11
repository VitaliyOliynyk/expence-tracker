import { prisma } from "@expence/db";
import type { Category, Prisma, Transaction, TransactionType } from "@expence/db";
import type { SummaryQuery, TransactionListQuery } from "@expence/types";

/**
 * Jedyne miejsce w backendzie dotykajace prisma.transaction.
 * Kazde zapytanie jest zawezone do userId - to jedyna bariera miedzy kontami.
 *
 * Kazda funkcja wolajaca baze moze rzucic blad Prismy (np.
 * `Prisma.PrismaClientKnownRequestError`), gdy baza odrzuci zapytanie albo
 * polaczenie z nia zawiedzie. Repozytorium ich nie lapie ani nie tlumaczy.
 */

type TransactionWithCategory = Transaction & { category: Category };

/**
 * Buduje warunek na zakres dat (oba konce wlacznie).
 *
 * Nie rzuca wyjatkow.
 *
 * @param dateFrom - poczatek zakresu (ISO 8601) albo brak.
 * @param dateTo - koniec zakresu (ISO 8601) albo brak.
 * @returns Fragment `where` z `date.gte`/`date.lte` albo pusty obiekt, gdy brak obu dat.
 */
function dateWhere(dateFrom?: string, dateTo?: string): Prisma.TransactionWhereInput {
  if (!dateFrom && !dateTo) return {};
  return {
    date: {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    },
  };
}

/**
 * Buduje warunek listy: wlasciciel + opcjonalne filtry typu, kategorii i dat.
 *
 * Nie rzuca wyjatkow.
 *
 * @param userId - wlasciciel transakcji.
 * @param query - filtry listy (pola stronicowania sa tu ignorowane).
 * @returns Warunek `where` dla `prisma.transaction`.
 */
function listWhere(userId: string, query: TransactionListQuery): Prisma.TransactionWhereInput {
  return {
    userId,
    ...(query.type ? { type: query.type } : {}),
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...dateWhere(query.dateFrom, query.dateTo),
  };
}

/**
 * Buduje warunek podsumowania: wlasciciel + wymagany typ + opcjonalny zakres dat.
 *
 * Nie rzuca wyjatkow.
 *
 * @param userId - wlasciciel transakcji.
 * @param query - query podsumowania (`groupBy` jest tu ignorowane).
 * @returns Warunek `where` dla `prisma.transaction`.
 */
function summaryWhere(userId: string, query: SummaryQuery): Prisma.TransactionWhereInput {
  return { userId, type: query.type, ...dateWhere(query.dateFrom, query.dateTo) };
}

/**
 * Jedna strona listy; `id` na koncu sortowania daje stabilna kolejnosc miedzy stronami.
 * Kolejnosc: najnowsza data, potem najpozniej utworzone.
 *
 * @param userId - wlasciciel transakcji.
 * @param query - filtry i stronicowanie (`page` od 1, `perPage` 1-100).
 * @returns Transakcje z dociagnieta kategoria; pusta tablica za ostatnia strona.
 * @throws Blad Prismy przy problemie z baza danych.
 */
export function findPage(
  userId: string,
  query: TransactionListQuery,
): Promise<TransactionWithCategory[]> {
  return prisma.transaction.findMany({
    where: listWhere(userId, query),
    include: { category: true },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    skip: (query.page - 1) * query.perPage,
    take: query.perPage,
  });
}

/**
 * Liczy wszystkie transakcje pasujace do filtrow listy (bez stronicowania).
 *
 * @param userId - wlasciciel transakcji.
 * @param query - filtry listy (pola stronicowania sa ignorowane).
 * @returns Liczba pasujacych transakcji.
 * @throws Blad Prismy przy problemie z baza danych.
 */
export function count(userId: string, query: TransactionListQuery): Promise<number> {
  return prisma.transaction.count({ where: listWhere(userId, query) });
}

/**
 * Sumy per typ dla tych samych filtrow co lista, ale z pominieciem filtra `type`.
 *
 * @param userId - wlasciciel transakcji.
 * @param query - filtry listy; `type` i stronicowanie sa ignorowane.
 * @returns Suma kwot w groszach dla `INCOME` i `EXPENSE`; typ bez transakcji ma 0.
 * @throws Blad Prismy przy problemie z baza danych.
 */
export async function sumByType(
  userId: string,
  query: TransactionListQuery,
): Promise<Record<TransactionType, number>> {
  const rows = await prisma.transaction.groupBy({
    by: ["type"],
    where: listWhere(userId, { ...query, type: undefined }),
    _sum: { amountCents: true },
  });
  const sums: Record<TransactionType, number> = { INCOME: 0, EXPENSE: 0 };
  for (const row of rows) sums[row.type] = row._sum.amountCents ?? 0;
  return sums;
}

/**
 * Szuka transakcji po `id`, zawezonej do wlasciciela.
 *
 * @param userId - wlasciciel transakcji.
 * @param id - id transakcji.
 * @returns Transakcja z kategoria albo `null`, gdy jej nie ma albo nalezy do innego uzytkownika.
 * @throws Blad Prismy przy problemie z baza danych.
 */
export function findById(userId: string, id: string): Promise<TransactionWithCategory | null> {
  return prisma.transaction.findFirst({
    where: { id, userId },
    include: { category: true },
  });
}

/**
 * Zapisuje nowa transakcje. Nie sprawdza wlasnosci kategorii - to zadanie serwisu.
 *
 * @param input - kompletne dane rekordu; `amountCents` w groszach, `date` jako `Date`.
 * @returns Utworzona transakcja z dociagnieta kategoria.
 * @throws {Prisma.PrismaClientKnownRequestError} `P2003`, gdy `categoryId` albo
 *   `userId` nie wskazuje istniejacego rekordu; inne kody przy problemie z baza.
 */
export function create(input: {
  userId: string;
  categoryId: string;
  amountCents: number;
  type: TransactionType;
  description: string | null;
  date: Date;
}): Promise<TransactionWithCategory> {
  return prisma.transaction.create({
    data: input,
    include: { category: true },
  });
}

/**
 * Aktualizuje transakcje zawezona do wlasciciela.
 * updateMany zamiast update: filtruje po userId, wiec cudzy rekord da count 0.
 *
 * @param userId - wlasciciel transakcji.
 * @param id - id aktualizowanej transakcji.
 * @param data - zmieniane pola (tylko te obecne w obiekcie).
 * @returns Liczba zmienionych rekordow: 1 albo 0 (brak albo cudza transakcja).
 * @throws {Prisma.PrismaClientKnownRequestError} `P2003`, gdy nowe `categoryId`
 *   nie wskazuje istniejacej kategorii; inne kody przy problemie z baza.
 */
export async function updateScoped(
  userId: string,
  id: string,
  data: Prisma.TransactionUncheckedUpdateManyInput,
): Promise<number> {
  const { count } = await prisma.transaction.updateMany({ where: { id, userId }, data });
  return count;
}

/**
 * Usuwa transakcje zawezona do wlasciciela (deleteMany z tego samego powodu co updateScoped).
 *
 * @param userId - wlasciciel transakcji.
 * @param id - id usuwanej transakcji.
 * @returns Liczba usunietych rekordow: 1 albo 0 (brak albo cudza transakcja).
 * @throws Blad Prismy przy problemie z baza danych.
 */
export async function deleteScoped(userId: string, id: string): Promise<number> {
  const { count } = await prisma.transaction.deleteMany({ where: { id, userId } });
  return count;
}

/**
 * Sprawdza, czy kategoria istnieje i nalezy do uzytkownika.
 * Kategorie nie sa jeszcze modulem CQRS, wiec nie ma komu wyslac zapytania -
 * sprawdzamy wlasnosc bezposrednio. Po migracji kategorii na modul zamienia sie
 * to na `dispatch(...)` do jego *.messages.ts.
 *
 * @param userId - domniemany wlasciciel kategorii.
 * @param categoryId - id sprawdzanej kategorii.
 * @returns `true`, gdy kategoria nalezy do uzytkownika; `false`, gdy jej nie ma albo jest cudza.
 * @throws Blad Prismy przy problemie z baza danych.
 */
export async function categoryBelongsToUser(userId: string, categoryId: string): Promise<boolean> {
  const count = await prisma.category.count({ where: { id: categoryId, userId } });
  return count > 0;
}

/**
 * Grupuje transakcje z filtrow podsumowania po kategorii.
 *
 * @param userId - wlasciciel transakcji.
 * @param query - `type` i zakres dat podsumowania.
 * @returns Wiersze `{ categoryId, _sum.amountCents, _count._all }`, bez nazw kategorii
 *   i w nieokreslonej kolejnosci.
 * @throws Blad Prismy przy problemie z baza danych.
 */
export function sumByCategory(userId: string, query: SummaryQuery) {
  return prisma.transaction.groupBy({
    by: ["categoryId"],
    where: summaryWhere(userId, query),
    _sum: { amountCents: true },
    _count: { _all: true },
  });
}

/**
 * Dociaga kategorie uzytkownika o podanych id (do etykiet podsumowania).
 *
 * @param userId - wlasciciel kategorii; cudze id sa po cichu pomijane.
 * @param ids - id kategorii do pobrania.
 * @returns Znalezione kategorie, w nieokreslonej kolejnosci.
 * @throws Blad Prismy przy problemie z baza danych.
 */
export function findCategoriesByIds(userId: string, ids: string[]): Promise<Category[]> {
  // Ten sam wyjatek co categoryBelongsToUser - kategorie nie sa jeszcze modulem CQRS.
  return prisma.category.findMany({ where: { userId, id: { in: ids } } });
}

/**
 * Pobiera same daty i kwoty transakcji z filtrow podsumowania (do grupowania po miesiacu).
 *
 * @param userId - wlasciciel transakcji.
 * @param query - `type` i zakres dat podsumowania.
 * @returns Pary `{ date, amountCents }` dla kazdej pasujacej transakcji.
 * @throws Blad Prismy przy problemie z baza danych.
 */
export function findAmountsByDate(
  userId: string,
  query: SummaryQuery,
): Promise<{ date: Date; amountCents: number }[]> {
  return prisma.transaction.findMany({
    where: summaryWhere(userId, query),
    select: { date: true, amountCents: true },
  });
}

import { prisma } from "@expence/db";
import type { Category, Prisma, Transaction, TransactionType } from "@expence/db";
import type { SummaryQuery, TransactionListQuery } from "@expence/types";

/**
 * Jedyne miejsce w backendzie dotykajace prisma.transaction.
 * Kazde zapytanie jest zawezone do userId - to jedyna bariera miedzy kontami.
 */

type TransactionWithCategory = Transaction & { category: Category };

function dateWhere(dateFrom?: string, dateTo?: string): Prisma.TransactionWhereInput {
  if (!dateFrom && !dateTo) return {};
  return {
    date: {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    },
  };
}

function listWhere(userId: string, query: TransactionListQuery): Prisma.TransactionWhereInput {
  return {
    userId,
    ...(query.type ? { type: query.type } : {}),
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...dateWhere(query.dateFrom, query.dateTo),
  };
}

function summaryWhere(userId: string, query: SummaryQuery): Prisma.TransactionWhereInput {
  return { userId, type: query.type, ...dateWhere(query.dateFrom, query.dateTo) };
}

export function findMany(
  userId: string,
  query: TransactionListQuery,
): Promise<TransactionWithCategory[]> {
  return prisma.transaction.findMany({
    where: listWhere(userId, query),
    include: { category: true },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
}

export function findById(userId: string, id: string): Promise<TransactionWithCategory | null> {
  return prisma.transaction.findFirst({
    where: { id, userId },
    include: { category: true },
  });
}

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

/** updateMany zamiast update: filtruje po userId, wiec cudzy rekord da count 0. */
export async function updateScoped(
  userId: string,
  id: string,
  data: Prisma.TransactionUncheckedUpdateManyInput,
): Promise<number> {
  const { count } = await prisma.transaction.updateMany({ where: { id, userId }, data });
  return count;
}

export async function deleteScoped(userId: string, id: string): Promise<number> {
  const { count } = await prisma.transaction.deleteMany({ where: { id, userId } });
  return count;
}

/**
 * Kategorie nie sa jeszcze modulem CQRS, wiec nie ma komu wyslac zapytania -
 * sprawdzamy wlasnosc bezposrednio. Po migracji kategorii na modul zamienia sie
 * to na `dispatch(...)` do jego *.messages.ts.
 */
export async function categoryBelongsToUser(userId: string, categoryId: string): Promise<boolean> {
  const count = await prisma.category.count({ where: { id: categoryId, userId } });
  return count > 0;
}

export function sumByCategory(userId: string, query: SummaryQuery) {
  return prisma.transaction.groupBy({
    by: ["categoryId"],
    where: summaryWhere(userId, query),
    _sum: { amountCents: true },
    _count: { _all: true },
  });
}

export function findCategoriesByIds(userId: string, ids: string[]): Promise<Category[]> {
  // Ten sam wyjatek co categoryBelongsToUser - kategorie nie sa jeszcze modulem CQRS.
  return prisma.category.findMany({ where: { userId, id: { in: ids } } });
}

export function findAmountsByDate(
  userId: string,
  query: SummaryQuery,
): Promise<{ date: Date; amountCents: number }[]> {
  return prisma.transaction.findMany({
    where: summaryWhere(userId, query),
    select: { date: true, amountCents: true },
  });
}

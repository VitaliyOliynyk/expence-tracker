import { prisma } from "@expence/db";
import type { Prisma } from "@expence/db";
import type {
  CreateExpenseInput,
  ExpenseDto,
  ExpenseListQuery,
  ExpenseListResponse,
  UpdateExpenseInput,
} from "@expence/types";
import { toExpenseDto } from "../mappers";

// Kazde zapytanie jest zawezone do userId - to jedyna bariera miedzy kontami.
function scopedWhere(userId: string, query?: Partial<ExpenseListQuery>): Prisma.ExpenseWhereInput {
  return {
    userId,
    ...(query?.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query?.from || query?.to
      ? {
          spentAt: {
            ...(query.from ? { gte: new Date(query.from) } : {}),
            ...(query.to ? { lte: new Date(query.to) } : {}),
          },
        }
      : {}),
    ...(query?.search
      ? { description: { contains: query.search, mode: "insensitive" as const } }
      : {}),
  };
}

export async function listExpenses(
  userId: string,
  query: ExpenseListQuery,
): Promise<ExpenseListResponse> {
  const where = scopedWhere(userId, query);

  const [items, total, sum] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: { category: true },
      orderBy: { [query.sort]: query.order },
      skip: (query.page - 1) * query.perPage,
      take: query.perPage,
    }),
    prisma.expense.count({ where }),
    prisma.expense.aggregate({ where, _sum: { amountCents: true } }),
  ]);

  return {
    items: items.map(toExpenseDto),
    page: query.page,
    perPage: query.perPage,
    total,
    totalCents: sum._sum.amountCents ?? 0,
  };
}

export async function getExpense(userId: string, id: string): Promise<ExpenseDto | null> {
  const expense = await prisma.expense.findFirst({
    where: { id, userId },
    include: { category: true },
  });
  return expense ? toExpenseDto(expense) : null;
}

export async function createExpense(
  userId: string,
  input: CreateExpenseInput,
): Promise<ExpenseDto> {
  const expense = await prisma.expense.create({
    data: {
      userId,
      // `amount` przyszlo juz przeliczone na grosze przez amountInputSchema.
      amountCents: input.amount,
      currency: input.currency,
      description: input.description ?? null,
      spentAt: new Date(input.spentAt),
      categoryId: input.categoryId ?? null,
    },
    include: { category: true },
  });
  return toExpenseDto(expense);
}

export async function updateExpense(
  userId: string,
  id: string,
  input: UpdateExpenseInput,
): Promise<ExpenseDto | null> {
  // updateMany zamiast update: filtruje po userId, wiec cudzy rekord da count 0.
  const { count } = await prisma.expense.updateMany({
    where: { id, userId },
    data: {
      ...(input.amount !== undefined ? { amountCents: input.amount } : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.description !== undefined ? { description: input.description ?? null } : {}),
      ...(input.spentAt !== undefined ? { spentAt: new Date(input.spentAt) } : {}),
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId ?? null } : {}),
    },
  });
  if (count === 0) return null;
  return getExpense(userId, id);
}

export async function deleteExpense(userId: string, id: string): Promise<boolean> {
  const { count } = await prisma.expense.deleteMany({ where: { id, userId } });
  return count > 0;
}

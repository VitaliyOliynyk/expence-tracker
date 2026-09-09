import { prisma } from "@expence/db";
import { DEFAULT_CURRENCY, type SummaryDto, type SummaryQuery } from "@expence/types";

const MONTH_LABELS = new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" });

function dateFilter(query: SummaryQuery) {
  if (!query.from && !query.to) return {};
  return {
    spentAt: {
      ...(query.from ? { gte: new Date(query.from) } : {}),
      ...(query.to ? { lte: new Date(query.to) } : {}),
    },
  };
}

export async function getSummary(userId: string, query: SummaryQuery): Promise<SummaryDto> {
  const where = { userId, ...dateFilter(query) };

  if (query.groupBy === "category") {
    const [grouped, categories] = await Promise.all([
      prisma.expense.groupBy({
        by: ["categoryId"],
        where,
        _sum: { amountCents: true },
        _count: { _all: true },
      }),
      prisma.category.findMany({ where: { userId } }),
    ]);

    const byId = new Map(categories.map((category) => [category.id, category]));
    const buckets = grouped
      .map((row) => {
        const category = row.categoryId ? byId.get(row.categoryId) : undefined;
        return {
          key: row.categoryId,
          label: category?.name ?? "Bez kategorii",
          color: category?.color ?? null,
          totalCents: row._sum.amountCents ?? 0,
          count: row._count._all,
        };
      })
      .sort((a, b) => b.totalCents - a.totalCents);

    return {
      currency: DEFAULT_CURRENCY,
      totalCents: buckets.reduce((sum, bucket) => sum + bucket.totalCents, 0),
      buckets,
    };
  }

  // groupBy=month: Prisma nie grupuje po wyrazeniu na dacie, wiec agregujemy
  // w pamieci. Przy skali produkcyjnej podmien to na $queryRaw z date_trunc.
  const expenses = await prisma.expense.findMany({
    where,
    select: { spentAt: true, amountCents: true },
  });

  const totals = new Map<string, { totalCents: number; count: number }>();
  for (const expense of expenses) {
    const key = expense.spentAt.toISOString().slice(0, 7);
    const current = totals.get(key) ?? { totalCents: 0, count: 0 };
    totals.set(key, {
      totalCents: current.totalCents + expense.amountCents,
      count: current.count + 1,
    });
  }

  const buckets = [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({
      key,
      label: MONTH_LABELS.format(new Date(`${key}-01T00:00:00.000Z`)),
      color: null,
      totalCents: value.totalCents,
      count: value.count,
    }));

  return {
    currency: DEFAULT_CURRENCY,
    totalCents: buckets.reduce((sum, bucket) => sum + bucket.totalCents, 0),
    buckets,
  };
}

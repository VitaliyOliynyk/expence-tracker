/**
 * Dane startowe do developmentu: jeden uzytkownik, zestaw kategorii i transakcje
 * z ostatnich trzech miesiecy (wystarczy na kilka stron listy po 10).
 * Uruchomienie: pnpm db:seed  (skrypt wskazany w prisma.config.ts)
 */
import "../src/load-env.js"; // musi byc pierwszy - ustawia DATABASE_URL dla klienta
import { hashPassword } from "@expence/auth";
import { prisma } from "../src/index.js";

const DEV_USER_EMAIL = "dev@expence.local";
const DEV_USER_PASSWORD = "dev12345";

const DEFAULT_CATEGORIES = [
  { name: "Wynagrodzenie", color: "#22c55e", icon: "wallet" },
  { name: "Jedzenie", color: "#ef4444", icon: "utensils" },
  { name: "Transport", color: "#3b82f6", icon: "bus" },
  { name: "Mieszkanie", color: "#8b5cf6", icon: "home" },
  { name: "Rozrywka", color: "#f59e0b", icon: "clapperboard" },
  { name: "Zdrowie", color: "#10b981", icon: "heart-pulse" },
  { name: "Inne", color: "#64748b", icon: "circle-dashed" },
];

/** Szablon jednego miesiaca; `day` to liczba dni od poczatku 30-dniowego okna. */
const MONTHLY_TRANSACTIONS = [
  { category: "Wynagrodzenie", type: "INCOME", amountCents: 850000, description: "Wynagrodzenie", day: 28 },
  { category: "Mieszkanie", type: "EXPENSE", amountCents: 185000, description: "Czynsz", day: 26 },
  { category: "Transport", type: "EXPENSE", amountCents: 12000, description: "Bilet miesieczny", day: 25 },
  { category: "Jedzenie", type: "EXPENSE", amountCents: 12750, description: "Zakupy spozywcze", day: 22 },
  { category: "Zdrowie", type: "EXPENSE", amountCents: 2599, description: "Apteka", day: 19 },
  { category: "Jedzenie", type: "EXPENSE", amountCents: 8900, description: "Restauracja", day: 15 },
  { category: "Transport", type: "EXPENSE", amountCents: 25000, description: "Paliwo", day: 12 },
  { category: "Rozrywka", type: "EXPENSE", amountCents: 3500, description: "Kino", day: 9 },
  { category: "Jedzenie", type: "EXPENSE", amountCents: 4290, description: "Zakupy spozywcze", day: 5 },
  { category: "Inne", type: "EXPENSE", amountCents: 6000, description: "Prezent", day: 2 },
] as const;

const SEEDED_MONTHS = 3;

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

async function main() {
  const passwordHash = await hashPassword(DEV_USER_PASSWORD);

  const user = await prisma.user.upsert({
    where: { email: DEV_USER_EMAIL },
    // update tez ustawia hash - naprawia konto zseedowane przed wprowadzeniem hasel.
    update: { passwordHash },
    create: {
      email: DEV_USER_EMAIL,
      name: "Dev User",
      passwordHash,
    },
  });

  for (const category of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { userId_name: { userId: user.id, name: category.name } },
      update: { color: category.color, icon: category.icon },
      create: { ...category, userId: user.id },
    });
  }

  const categories = await prisma.category.findMany({ where: { userId: user.id } });
  const categoryIdByName = new Map(categories.map((category) => [category.name, category.id]));

  function categoryId(name: string): string {
    const id = categoryIdByName.get(name);
    if (!id) throw new Error(`Brak kategorii startowej: ${name}`);
    return id;
  }

  // Transakcje dokladamy tylko przy pustej bazie, zeby powtorny seed nie mnozyl danych.
  const existingTransactions = await prisma.transaction.count({ where: { userId: user.id } });
  if (existingTransactions === 0) {
    const data = Array.from({ length: SEEDED_MONTHS }, (_, month) =>
      MONTHLY_TRANSACTIONS.map((transaction) => ({
        userId: user.id,
        categoryId: categoryId(transaction.category),
        amountCents: transaction.amountCents,
        type: transaction.type,
        description: transaction.description,
        date: daysAgo(month * 30 + (30 - transaction.day)),
      })),
    ).flat();

    await prisma.transaction.createMany({ data });
  }

  const transactionCount = await prisma.transaction.count({ where: { userId: user.id } });
  console.log(
    `Seed gotowy: ${user.email} / ${DEV_USER_PASSWORD}, kategorii: ${categories.length}, transakcji: ${transactionCount}`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

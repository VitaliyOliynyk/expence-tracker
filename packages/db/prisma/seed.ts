/**
 * Dane startowe do developmentu: jeden uzytkownik, zestaw kategorii i kilka wydatkow.
 * Uruchomienie: pnpm db:seed  (skrypt wskazany w prisma.config.ts)
 */
import "../src/load-env.js"; // musi byc pierwszy - ustawia DATABASE_URL dla klienta
import { hashPassword } from "@expence/auth";
import { prisma } from "../src/index.js";

const DEV_USER_EMAIL = "dev@expence.local";
const DEV_USER_PASSWORD = "dev12345";

const DEFAULT_CATEGORIES = [
  { name: "Jedzenie", color: "#ef4444", icon: "utensils" },
  { name: "Transport", color: "#3b82f6", icon: "bus" },
  { name: "Mieszkanie", color: "#8b5cf6", icon: "home" },
  { name: "Rozrywka", color: "#f59e0b", icon: "clapperboard" },
  { name: "Zdrowie", color: "#10b981", icon: "heart-pulse" },
  { name: "Inne", color: "#64748b", icon: "circle-dashed" },
];

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

  // Wydatki dokladamy tylko przy pustej bazie, zeby powtorny seed nie mnozyl danych.
  const existingExpenses = await prisma.expense.count({ where: { userId: user.id } });
  if (existingExpenses === 0) {
    await prisma.expense.createMany({
      data: [
        {
          userId: user.id,
          categoryId: categoryIdByName.get("Jedzenie") ?? null,
          amountCents: 4290,
          description: "Zakupy spozywcze",
          spentAt: daysAgo(1),
        },
        {
          userId: user.id,
          categoryId: categoryIdByName.get("Transport") ?? null,
          amountCents: 12000,
          description: "Bilet miesieczny",
          spentAt: daysAgo(5),
        },
        {
          userId: user.id,
          categoryId: categoryIdByName.get("Rozrywka") ?? null,
          amountCents: 3500,
          description: "Kino",
          spentAt: daysAgo(9),
        },
        {
          userId: user.id,
          categoryId: categoryIdByName.get("Mieszkanie") ?? null,
          amountCents: 185000,
          description: "Czynsz",
          spentAt: daysAgo(20),
        },
      ],
    });
  }

  console.log(
    `Seed gotowy: ${user.email} / ${DEV_USER_PASSWORD}, kategorii: ${categories.length}`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

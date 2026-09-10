import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

// Prisma 7 nie czyta juz URL-a ze schematu - polaczenie idzie przez driver adapter.
function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Brak DATABASE_URL. Skopiuj .env.example do .env w korzeniu monorepo.");
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
  });
}

// Hot reload w Next.js przeladowuje moduly przy kazdej zmianie pliku.
// Bez tego cache'a co przeladowanie powstawalby nowy pool polaczen do Postgresa.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export { PrismaClient };
export * from "./generated/prisma/client";

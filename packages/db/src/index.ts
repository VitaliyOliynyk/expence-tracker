import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

/**
 * Tworzy klienta Prismy polaczonego z Postgresem przez driver adapter.
 * Prisma 7 nie czyta juz URL-a ze schematu - polaczenie idzie przez driver adapter.
 * Samo utworzenie nie otwiera polaczenia - bledy sieci wyjda przy pierwszym zapytaniu.
 *
 * @returns Nowy `PrismaClient`; w trybie development loguje tez zapytania.
 * @throws {Error} gdy brak zmiennej `DATABASE_URL` - leci juz przy imporcie `@expence/db`.
 */
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

/** Singleton klienta Prismy; w dev przezywa hot reload dzieki cache'owi na globalThis. */
export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export { PrismaClient };
export * from "./generated/prisma/client";

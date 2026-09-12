import { prisma } from "@expence/db";

// Opis OpenAPI: src/openapi/system.paths.ts - zmiana statusow wymaga zmiany tam.

/**
 * GET /api/health - healthcheck backendu i bazy (`SELECT 1`).
 * Publiczny endpoint (wyjatek w PUBLIC_PATHS w proxy.ts).
 *
 * Nie rzuca wyjatkow - niedostepna baza konczy sie odpowiedzia 503.
 *
 * @returns 200 z `{ status: "ok", database: "up" }` albo 503 z
 *   `{ status: "degraded", database: "down" }`, gdy baza nie odpowiada.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", database: "up" });
  } catch {
    return Response.json({ status: "degraded", database: "down" }, { status: 503 });
  }
}

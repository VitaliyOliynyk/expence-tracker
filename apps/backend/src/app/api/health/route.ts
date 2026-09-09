import { prisma } from "@expence/db";

// Publiczny endpoint (wyjatek w PUBLIC_PATHS w proxy.ts) - sprawdza tez baze.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", database: "up" });
  } catch {
    return Response.json({ status: "degraded", database: "down" }, { status: 503 });
  }
}

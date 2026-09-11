import { summaryQuerySchema } from "@expence/types";
import { requireUserId } from "@/lib/auth-context";
import { ok, parseQuery } from "@/lib/http";
import { dispatch } from "@/server/bus";
import { GetTransactionSummaryQuery } from "@/server/modules/transaction/transaction.messages";

// Opis OpenAPI: src/openapi/transaction.paths.ts - zmiana statusow wymaga zmiany tam.

/**
 * GET /api/summary - suma transakcji jednego typu pogrupowana po kategorii albo miesiacu.
 *
 * @param request - zadanie z naglowkiem `x-user-id` i query `summaryQuerySchema`
 *   (`type`, `groupBy`, zakres dat).
 * @returns 200 z `SummaryDto`, 400 przy blednym query, 401 bez `x-user-id` (w praktyce odcina to wczesniej proxy.ts).
 * @throws Blad Prismy przy problemie z baza danych - handler go nie lapie, Next zwraca wtedy 500.
 */
export async function GET(request: Request) {
  const auth = requireUserId(request);
  if (auth.error) return auth.error;

  const query = parseQuery(request, summaryQuerySchema);
  if (query.error) return query.error;

  return ok(await dispatch(GetTransactionSummaryQuery({ userId: auth.userId, query: query.data })));
}

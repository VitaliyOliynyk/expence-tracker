import { createTransactionSchema, transactionListQuerySchema } from "@expence/types";
import { requireUserId } from "@/lib/auth-context";
import { created, fail, ok, parseJsonBody, parseQuery } from "@/lib/http";
import { dispatch } from "@/server/bus";
import {
  CreateTransactionCommand,
  ListTransactionsQuery,
} from "@/server/modules/transaction/transaction.messages";
import { TransactionCategoryNotFoundError } from "@/server/modules/transaction/transaction.errors";

// Opis OpenAPI tych endpointow: src/openapi/transaction.paths.ts - zmiana statusow wymaga zmiany tam.

/**
 * GET /api/transactions - strona transakcji zalogowanego uzytkownika z licznikiem i sumami.
 *
 * @param request - zadanie z naglowkiem `x-user-id` i filtrami w query
 *   (`transactionListQuerySchema`: daty, typ, kategoria, `page`, `perPage`).
 * @returns 200 z `TransactionListResponse`, 400 przy blednym query, 401 bez `x-user-id` (w praktyce odcina to wczesniej proxy.ts).
 * @throws Blad Prismy przy problemie z baza danych - handler go nie lapie, Next zwraca wtedy 500.
 */
export async function GET(request: Request) {
  const auth = requireUserId(request);
  if (auth.error) return auth.error;

  const query = parseQuery(request, transactionListQuerySchema);
  if (query.error) return query.error;

  return ok(await dispatch(ListTransactionsQuery({ userId: auth.userId, query: query.data })));
}

/**
 * POST /api/transactions - tworzy transakcje zalogowanego uzytkownika.
 *
 * Nie rzuca wyjatkow - kazdy blad zapisu tlumaczy na odpowiedz.
 *
 * @param request - zadanie z naglowkiem `x-user-id` i body `createTransactionSchema`.
 * @returns 201 z `TransactionDto`, 400 przy blednym body albo cudzej/nieistniejacej kategorii,
 *   401 bez `x-user-id` (w praktyce odcina to wczesniej proxy.ts), 500 `INTERNAL` przy innym bledzie zapisu.
 */
export async function POST(request: Request) {
  const auth = requireUserId(request);
  if (auth.error) return auth.error;

  const body = await parseJsonBody(request, createTransactionSchema);
  if (body.error) return body.error;

  try {
    return created(
      await dispatch(CreateTransactionCommand({ userId: auth.userId, input: body.data })),
    );
  } catch (error) {
    if (error instanceof TransactionCategoryNotFoundError) {
      return fail("BAD_REQUEST", "Nieprawidlowe dane wejsciowe", {
        categoryId: ["Nie znaleziono kategorii"],
      });
    }
    console.error("POST /api/transactions", error);
    return fail("INTERNAL", "Nie udalo sie zapisac transakcji");
  }
}

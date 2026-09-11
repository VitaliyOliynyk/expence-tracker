import { updateTransactionSchema } from "@expence/types";
import { requireUserId } from "@/lib/auth-context";
import { fail, noContent, ok, parseJsonBody } from "@/lib/http";
import { dispatch } from "@/server/bus";
import {
  DeleteTransactionCommand,
  GetTransactionQuery,
  UpdateTransactionCommand,
} from "@/server/modules/transaction/transaction.messages";
import { TransactionCategoryNotFoundError } from "@/server/modules/transaction/transaction.errors";

// W Next 15+ `params` jest asynchroniczne.
type RouteContext = { params: Promise<{ id: string }> };

// Opis OpenAPI tych endpointow: src/openapi/transaction.paths.ts - zmiana statusow wymaga zmiany tam.

/**
 * GET /api/transactions/{id} - pojedyncza transakcja zalogowanego uzytkownika.
 *
 * @param request - zadanie z naglowkiem `x-user-id`.
 * @param context - kontekst trasy z asynchronicznym `params.id`.
 * @returns 200 z `TransactionDto`, 404 gdy transakcji nie ma albo jest cudza, 401 bez `x-user-id` (w praktyce odcina to wczesniej proxy.ts).
 * @throws Blad Prismy przy problemie z baza danych - handler go nie lapie, Next zwraca wtedy 500.
 */
export async function GET(request: Request, { params }: RouteContext) {
  const auth = requireUserId(request);
  if (auth.error) return auth.error;

  const { id } = await params;
  const transaction = await dispatch(GetTransactionQuery({ userId: auth.userId, id }));
  return transaction ? ok(transaction) : fail("NOT_FOUND", "Nie znaleziono transakcji");
}

/**
 * PATCH /api/transactions/{id} - czesciowa aktualizacja transakcji zalogowanego uzytkownika.
 *
 * Nie rzuca wyjatkow - kazdy blad zapisu tlumaczy na odpowiedz.
 *
 * @param request - zadanie z naglowkiem `x-user-id` i body `updateTransactionSchema`.
 * @param context - kontekst trasy z asynchronicznym `params.id`.
 * @returns 200 z `TransactionDto` po zmianie, 400 przy blednym body albo cudzej/nieistniejacej
 *   kategorii, 404 gdy transakcji nie ma albo jest cudza, 401 bez `x-user-id` (w praktyce odcina to wczesniej proxy.ts),
 *   500 `INTERNAL` przy innym bledzie zapisu.
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = requireUserId(request);
  if (auth.error) return auth.error;

  const body = await parseJsonBody(request, updateTransactionSchema);
  if (body.error) return body.error;

  const { id } = await params;
  try {
    const transaction = await dispatch(
      UpdateTransactionCommand({ userId: auth.userId, id, input: body.data }),
    );
    return transaction ? ok(transaction) : fail("NOT_FOUND", "Nie znaleziono transakcji");
  } catch (error) {
    if (error instanceof TransactionCategoryNotFoundError) {
      return fail("BAD_REQUEST", "Nieprawidlowe dane wejsciowe", {
        categoryId: ["Nie znaleziono kategorii"],
      });
    }
    console.error("PATCH /api/transactions/[id]", error);
    return fail("INTERNAL", "Nie udalo sie zapisac transakcji");
  }
}

/**
 * DELETE /api/transactions/{id} - usuwa transakcje zalogowanego uzytkownika.
 *
 * @param request - zadanie z naglowkiem `x-user-id`.
 * @param context - kontekst trasy z asynchronicznym `params.id`.
 * @returns 204 bez ciala, 404 gdy transakcji nie ma albo jest cudza, 401 bez `x-user-id` (w praktyce odcina to wczesniej proxy.ts).
 * @throws Blad Prismy przy problemie z baza danych - handler go nie lapie, Next zwraca wtedy 500.
 */
export async function DELETE(request: Request, { params }: RouteContext) {
  const auth = requireUserId(request);
  if (auth.error) return auth.error;

  const { id } = await params;
  const deleted = await dispatch(DeleteTransactionCommand({ userId: auth.userId, id }));
  return deleted ? noContent() : fail("NOT_FOUND", "Nie znaleziono transakcji");
}

import { updateCategorySchema } from "@expence/types";
import { requireUserId } from "@/lib/auth-context";
import { fail, noContent, ok, parseJsonBody } from "@/lib/http";
import {
  CategoryInUseError,
  deleteCategory,
  updateCategory,
} from "@/server/services/category.service";

type RouteContext = { params: Promise<{ id: string }> };

// Opis OpenAPI tych endpointow: src/openapi/category.paths.ts - zmiana statusow wymaga zmiany tam.

/**
 * PATCH /api/categories/{id} - czesciowa aktualizacja kategorii zalogowanego uzytkownika.
 *
 * @param request - zadanie z naglowkiem `x-user-id` i body `updateCategorySchema`.
 * @param context - kontekst trasy z asynchronicznym `params.id`.
 * @returns 200 z `CategoryDto` po zmianie, 400 przy blednym body, 404 gdy kategorii nie ma
 *   albo jest cudza, 401 bez `x-user-id` (w praktyce odcina to wczesniej proxy.ts).
 * @throws Blad Prismy przy problemie z baza danych, takze `P2002` przy nazwie zajetej przez
 *   inna kategorie uzytkownika - handler go nie lapie, Next zwraca wtedy 500.
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = requireUserId(request);
  if (auth.error) return auth.error;

  const body = await parseJsonBody(request, updateCategorySchema);
  if (body.error) return body.error;

  const { id } = await params;
  const category = await updateCategory(auth.userId, id, body.data);
  return category ? ok(category) : fail("NOT_FOUND", "Nie znaleziono kategorii");
}

/**
 * DELETE /api/categories/{id} - usuwa kategorie zalogowanego uzytkownika.
 *
 * Nie rzuca wyjatkow - kazdy blad usuwania tlumaczy na odpowiedz.
 *
 * @param request - zadanie z naglowkiem `x-user-id`.
 * @param context - kontekst trasy z asynchronicznym `params.id`.
 * @returns 204 bez ciala, 404 gdy kategorii nie ma albo jest cudza, 409 gdy kategoria ma
 *   przypisane transakcje, 401 bez `x-user-id` (w praktyce odcina to wczesniej proxy.ts),
 *   500 `INTERNAL` przy innym bledzie usuwania.
 */
export async function DELETE(request: Request, { params }: RouteContext) {
  const auth = requireUserId(request);
  if (auth.error) return auth.error;

  const { id } = await params;
  try {
    const deleted = await deleteCategory(auth.userId, id);
    return deleted ? noContent() : fail("NOT_FOUND", "Nie znaleziono kategorii");
  } catch (error) {
    if (error instanceof CategoryInUseError) {
      return fail("CONFLICT", "Kategoria ma przypisane transakcje");
    }
    console.error("DELETE /api/categories/[id]", error);
    return fail("INTERNAL", "Nie udalo sie usunac kategorii");
  }
}

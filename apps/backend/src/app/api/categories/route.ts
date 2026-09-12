import { createCategorySchema } from "@expence/types";
import { requireUserId } from "@/lib/auth-context";
import { created, fail, ok, parseJsonBody } from "@/lib/http";
import { createCategory, listCategories } from "@/server/services/category.service";

// Opis OpenAPI tych endpointow: src/openapi/category.paths.ts - zmiana statusow wymaga zmiany tam.

/**
 * GET /api/categories - wszystkie kategorie zalogowanego uzytkownika, alfabetycznie po nazwie.
 *
 * @param request - zadanie z naglowkiem `x-user-id`.
 * @returns 200 z `CategoryDto[]` (bez stronicowania), 401 bez `x-user-id` (w praktyce odcina to wczesniej proxy.ts).
 * @throws Blad Prismy przy problemie z baza danych - handler go nie lapie, Next zwraca wtedy 500.
 */
export async function GET(request: Request) {
  const auth = requireUserId(request);
  if (auth.error) return auth.error;

  return ok(await listCategories(auth.userId));
}

/**
 * POST /api/categories - tworzy kategorie zalogowanego uzytkownika.
 *
 * Nie rzuca wyjatkow - kazdy blad zapisu tlumaczy na odpowiedz.
 *
 * @param request - zadanie z naglowkiem `x-user-id` i body `createCategorySchema`.
 * @returns 201 z `CategoryDto`, 400 przy blednym body, 409 gdy uzytkownik ma juz kategorie
 *   o tej nazwie, 401 bez `x-user-id` (w praktyce odcina to wczesniej proxy.ts),
 *   500 `INTERNAL` przy innym bledzie zapisu.
 */
export async function POST(request: Request) {
  const auth = requireUserId(request);
  if (auth.error) return auth.error;

  const body = await parseJsonBody(request, createCategorySchema);
  if (body.error) return body.error;

  try {
    return created(await createCategory(auth.userId, body.data));
  } catch (error) {
    // @@unique([userId, name]) - powtorzona nazwa kategorii u tego samego uzytkownika.
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return fail("CONFLICT", "Kategoria o tej nazwie juz istnieje");
    }
    console.error("POST /api/categories", error);
    return fail("INTERNAL", "Nie udalo sie zapisac kategorii");
  }
}

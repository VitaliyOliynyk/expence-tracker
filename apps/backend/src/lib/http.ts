import type { ZodType } from "zod";
import type { ApiError, ApiErrorCode } from "@expence/types";

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL: 500,
};

/**
 * Odpowiedz 200 z cialem JSON.
 *
 * Nie rzuca wyjatkow.
 *
 * @param data - cialo odpowiedzi, serializowane przez `Response.json`.
 * @param init - dodatkowe opcje odpowiedzi (np. naglowki); `status` z `init` nadpisuje 200.
 * @returns Odpowiedz JSON.
 */
export function ok<T>(data: T, init?: ResponseInit): Response {
  return Response.json(data, { status: 200, ...init });
}

/**
 * Odpowiedz 201 z cialem JSON - dla utworzonego zasobu.
 *
 * Nie rzuca wyjatkow.
 *
 * @param data - utworzony zasob.
 * @returns Odpowiedz JSON ze statusem 201.
 */
export function created<T>(data: T): Response {
  return Response.json(data, { status: 201 });
}

/**
 * Odpowiedz 204 bez ciala - np. po usunieciu zasobu.
 *
 * Nie rzuca wyjatkow.
 *
 * @returns Pusta odpowiedz ze statusem 204.
 */
export function noContent(): Response {
  return new Response(null, { status: 204 });
}

/**
 * Odpowiedz bledu w ksztalcie `apiErrorSchema`; status HTTP wynika z `code`.
 * Jedyny dozwolony sposob zwracania bledow z route handlerow.
 *
 * Nie rzuca wyjatkow.
 *
 * @param code - kod bledu z kontraktu (`BAD_REQUEST` -> 400, `NOT_FOUND` -> 404 itd.).
 * @param message - komunikat dla czlowieka.
 * @param fields - opcjonalna mapa pole -> lista komunikatow (bledy walidacji).
 * @returns Odpowiedz JSON `{ error: { code, message, fields? } }`.
 */
export function fail(
  code: ApiErrorCode,
  message: string,
  fields?: ApiError["error"]["fields"],
): Response {
  const body: ApiError = { error: { code, message, ...(fields ? { fields } : {}) } };
  return Response.json(body, { status: STATUS_BY_CODE[code] });
}

/**
 * `flatten().fieldErrors` z Zoda ma wartosci opcjonalne (`string[] | undefined`),
 * a kontrakt apiErrorSchema wymaga tablic - odsiewamy puste wpisy.
 *
 * Nie rzuca wyjatkow.
 *
 * @param raw - `fieldErrors` z `ZodError.flatten()`.
 * @returns Mapa pole -> lista komunikatow, bez pol z wartoscia `undefined`.
 */
function toFieldErrors(raw: Record<string, string[] | undefined>): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(raw).filter((entry): entry is [string, string[]] => entry[1] !== undefined),
  );
}

/**
 * Walidacja body JSON. Zwraca dane albo gotowa odpowiedz 400 z mapa bledow pol.
 *
 * Nie rzuca wyjatkow - body, ktore nie jest JSON-em, i bledy walidacji zamienia na 400.
 *
 * @param request - zadanie z body JSON.
 * @param schema - schemat Zod z `@expence/types`, ten sam co w formularzu.
 * @returns `{ data }` z wynikiem schematu (po transformacjach) albo `{ error }` z odpowiedzia 400.
 */
export async function parseJsonBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<{ data: T; error?: undefined } | { data?: undefined; error: Response }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { error: fail("BAD_REQUEST", "Body musi byc poprawnym JSON-em") };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const flattened = result.error.flatten();
    return {
      error: fail("BAD_REQUEST", "Nieprawidlowe dane wejsciowe", toFieldErrors(flattened.fieldErrors)),
    };
  }
  return { data: result.data };
}

/**
 * Walidacja query stringa tym samym schematem Zod co formularz po stronie UI.
 *
 * Nie rzuca wyjatkow - bledy walidacji zamienia na 400.
 *
 * @param request - zadanie; parametry sa czytane z `request.url` jako stringi.
 * @param schema - schemat Zod z `@expence/types` (koercje liczb robi sam schemat).
 * @returns `{ data }` z wynikiem schematu albo `{ error }` z odpowiedzia 400.
 */
export function parseQuery<T>(
  request: Request,
  schema: ZodType<T>,
): { data: T; error?: undefined } | { data?: undefined; error: Response } {
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const result = schema.safeParse(params);
  if (!result.success) {
    return {
      error: fail(
        "BAD_REQUEST",
        "Nieprawidlowe parametry zapytania",
        toFieldErrors(result.error.flatten().fieldErrors),
      ),
    };
  }
  return { data: result.data };
}

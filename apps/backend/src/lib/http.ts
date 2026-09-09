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

export function ok<T>(data: T, init?: ResponseInit): Response {
  return Response.json(data, { status: 200, ...init });
}

export function created<T>(data: T): Response {
  return Response.json(data, { status: 201 });
}

export function noContent(): Response {
  return new Response(null, { status: 204 });
}

export function fail(
  code: ApiErrorCode,
  message: string,
  fields?: ApiError["error"]["fields"],
): Response {
  const body: ApiError = { error: { code, message, ...(fields ? { fields } : {}) } };
  return Response.json(body, { status: STATUS_BY_CODE[code] });
}

/** Walidacja body JSON. Zwraca dane albo gotowa odpowiedz 400 z mapa bledow pol. */
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
      error: fail("BAD_REQUEST", "Nieprawidlowe dane wejsciowe", flattened.fieldErrors),
    };
  }
  return { data: result.data };
}

/** Walidacja query stringa tym samym schematem Zod co formularz po stronie UI. */
export function parseQuery<T>(
  request: Request,
  schema: ZodType<T>,
): { data: T; error?: undefined } | { data?: undefined; error: Response } {
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const result = schema.safeParse(params);
  if (!result.success) {
    return {
      error: fail("BAD_REQUEST", "Nieprawidlowe parametry zapytania", result.error.flatten().fieldErrors),
    };
  }
  return { data: result.data };
}

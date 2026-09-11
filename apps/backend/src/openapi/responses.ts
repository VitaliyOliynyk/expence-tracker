import { apiErrorSchema } from "@expence/types";
import type { ZodOpenApiExamplesObject, ZodOpenApiResponseObject } from "zod-openapi";

/**
 * Odpowiedzi bledow wspolne dla wszystkich modulow. Kazda ma ksztalt
 * `apiErrorSchema` - ten sam, ktory buduje `fail()` z `src/lib/http.ts`.
 * Odpowiedz z `id` trafia do `components.responses` i jest wstawiana jako $ref.
 */

/** Przyklad bledu walidacji body - komunikat z `parseJsonBody`. */
export const invalidBodyExample = {
  summary: "Bledy walidacji body",
  value: {
    error: {
      code: "BAD_REQUEST",
      message: "Nieprawidlowe dane wejsciowe",
      fields: { amount: ["Kwota musi byc wieksza od zera"] },
    },
  },
};

/** Przyklad body, ktore nie jest JSON-em - komunikat z `parseJsonBody`. */
export const malformedJsonExample = {
  summary: "Body nie jest poprawnym JSON-em",
  value: { error: { code: "BAD_REQUEST", message: "Body musi byc poprawnym JSON-em" } },
};

/** Przyklad bledu walidacji query stringa - komunikat z `parseQuery`. */
export const invalidQueryExample = {
  summary: "Bledy walidacji query",
  value: {
    error: {
      code: "BAD_REQUEST",
      message: "Nieprawidlowe parametry zapytania",
      fields: { dateFrom: ["Data 'dateFrom' musi byc wczesniejsza niz 'dateTo'"] },
    },
  },
};

/**
 * Buduje odpowiedz 400 z przykladami wlasciwymi dla danego endpointu.
 * Bez `id`, bo przyklady roznia sie miedzy endpointami.
 *
 * Nie rzuca wyjatkow.
 *
 * @param examples - nazwane przyklady bledow, ktore endpoint moze zwrocic.
 * @returns Obiekt odpowiedzi 400 ze schematem `ApiError`.
 */
export function badRequestResponse(examples: ZodOpenApiExamplesObject): ZodOpenApiResponseObject {
  return {
    description: "Nieprawidlowe dane wejsciowe - `fields` mapuje pole na liste komunikatow",
    content: { "application/json": { schema: apiErrorSchema, examples } },
  };
}

/** 401 - zwraca go `proxy.ts`, zanim zadanie dojdzie do route handlera. */
export const unauthorizedResponse: ZodOpenApiResponseObject = {
  id: "Unauthorized",
  description: "Brak albo niewazny token Bearer (np. wygasl po 10 minutach)",
  content: {
    "application/json": {
      schema: apiErrorSchema,
      example: { error: { code: "UNAUTHORIZED", message: "Wymagany token dostepu" } },
    },
  },
};

/**
 * 500 z handlera, ktory nie lapie wyjatkow (np. baza niedostepna).
 * Next zwraca wtedy wlasna odpowiedz - bez ciala w ksztalcie `ApiError`.
 */
export const unhandledErrorResponse: ZodOpenApiResponseObject = {
  id: "UnhandledError",
  description: "Nieobsluzony blad serwera (np. baza niedostepna); cialo nie ma ksztaltu ApiError",
};

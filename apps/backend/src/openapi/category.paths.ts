import {
  apiErrorSchema,
  categoryDtoSchema,
  createCategorySchema,
  updateCategorySchema,
} from "@expence/types";
import type { CategoryDto, CreateCategoryFormValues } from "@expence/types";
import { z } from "zod";
import type { ZodOpenApiPathsObject, ZodOpenApiResponseObject } from "zod-openapi";
import {
  badRequestResponse,
  malformedJsonExample,
  unauthorizedResponse,
  unhandledErrorResponse,
} from "./responses";

/**
 * Opis endpointow kategorii: `/api/categories` i `/api/categories/{id}`. Statusy
 * odpowiadaja temu, co faktycznie zwracaja route handlery w `src/app/api/categories`
 * (wolajace `category.service.ts` bezposrednio) - zmiana handlera wymaga zmiany tutaj.
 */

export const CATEGORIES_TAG = "categories";

/* Przyklady dla Swagger UI - kategorie jak z seeda. */

const exampleFoodCategory = {
  id: "01a08d61-6efb-760c-bd2f-6711e0d26375",
  name: "Jedzenie",
  color: "#ef4444",
  icon: "utensils",
  createdAt: "2026-09-01T08:00:00.000Z",
} satisfies CategoryDto;

const exampleTransportCategory = {
  id: "01a08d61-6efb-760c-bd2f-6711e0d26376",
  name: "Transport",
  color: "#3b82f6",
  icon: "bus",
  createdAt: "2026-09-01T08:00:00.000Z",
} satisfies CategoryDto;

const exampleCreateBody = {
  name: "Jedzenie",
  color: "#ef4444",
  icon: "utensils",
} satisfies CreateCategoryFormValues;

const exampleUpdateBody = {
  color: "#f97316",
} satisfies z.input<typeof updateCategorySchema>;

const categoryIdParams = z.object({
  id: z.string().meta({ description: "Id kategorii (UUID v7)", example: exampleFoodCategory.id }),
});

/** Przyklad bledu walidacji body - komunikaty z `createCategorySchema`. */
const invalidCategoryBodyExample = {
  summary: "Bledy walidacji body",
  value: {
    error: {
      code: "BAD_REQUEST",
      message: "Nieprawidlowe dane wejsciowe",
      fields: { color: ["Kolor musi byc w formacie #rrggbb"] },
    },
  },
};

const categoryNotFoundResponse: ZodOpenApiResponseObject = {
  id: "CategoryNotFound",
  description: "Kategorii nie ma albo nalezy do innego uzytkownika (celowo nierozroznialne)",
  content: {
    "application/json": {
      schema: apiErrorSchema,
      example: { error: { code: "NOT_FOUND", message: "Nie znaleziono kategorii" } },
    },
  },
};

export const categoryPaths: ZodOpenApiPathsObject = {
  "/api/categories": {
    get: {
      tags: [CATEGORIES_TAG],
      operationId: "listCategories",
      summary: "Lista kategorii",
      description: "Wszystkie kategorie zalogowanego uzytkownika, alfabetycznie po nazwie.",
      responses: {
        "200": {
          description: "Kategorie uzytkownika (bez stronicowania)",
          content: {
            "application/json": {
              schema: z.array(categoryDtoSchema),
              example: [exampleFoodCategory, exampleTransportCategory],
            },
          },
        },
        "401": unauthorizedResponse,
        "500": unhandledErrorResponse,
      },
    },
    post: {
      tags: [CATEGORIES_TAG],
      operationId: "createCategory",
      summary: "Utworzenie kategorii",
      description:
        "Nazwa musi byc unikalna w obrebie uzytkownika. Bez `color` kategoria dostaje " +
        "`#64748b`; `icon` to nazwa ikony `lucide-react` (opcjonalna).",
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: createCategorySchema, example: exampleCreateBody },
        },
      },
      responses: {
        "201": {
          description: "Utworzona kategoria",
          content: {
            "application/json": { schema: categoryDtoSchema, example: exampleFoodCategory },
          },
        },
        "400": badRequestResponse({
          invalidBody: invalidCategoryBodyExample,
          malformedJson: malformedJsonExample,
        }),
        "401": unauthorizedResponse,
        "409": {
          description: "Uzytkownik ma juz kategorie o tej nazwie",
          content: {
            "application/json": {
              schema: apiErrorSchema,
              example: {
                error: { code: "CONFLICT", message: "Kategoria o tej nazwie juz istnieje" },
              },
            },
          },
        },
        "500": {
          description: "Nieoczekiwany blad zapisu kategorii (logowany przez console.error)",
          content: {
            "application/json": {
              schema: apiErrorSchema,
              example: { error: { code: "INTERNAL", message: "Nie udalo sie zapisac kategorii" } },
            },
          },
        },
      },
    },
  },
  "/api/categories/{id}": {
    patch: {
      tags: [CATEGORIES_TAG],
      operationId: "updateCategory",
      summary: "Czesciowa aktualizacja kategorii",
      description:
        "Zmienia tylko przeslane pola; `icon: null` usuwa ikone. Zmiana nazwy na juz " +
        "zajeta nie jest obslugiwana osobno i konczy sie odpowiedzia 500.",
      requestParams: { path: categoryIdParams },
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: updateCategorySchema, example: exampleUpdateBody },
        },
      },
      responses: {
        "200": {
          description: "Kategoria po zmianie",
          content: {
            "application/json": {
              schema: categoryDtoSchema,
              example: { ...exampleFoodCategory, color: exampleUpdateBody.color },
            },
          },
        },
        "400": badRequestResponse({
          invalidBody: invalidCategoryBodyExample,
          malformedJson: malformedJsonExample,
        }),
        "401": unauthorizedResponse,
        "404": categoryNotFoundResponse,
        "500": unhandledErrorResponse,
      },
    },
    delete: {
      tags: [CATEGORIES_TAG],
      operationId: "deleteCategory",
      summary: "Usuniecie kategorii",
      description: "Kategorii z przypisanymi transakcjami nie da sie usunac.",
      requestParams: { path: categoryIdParams },
      responses: {
        "204": { description: "Kategoria usunieta - bez ciala odpowiedzi" },
        "401": unauthorizedResponse,
        "404": categoryNotFoundResponse,
        "409": {
          description: "Kategoria ma przypisane transakcje",
          content: {
            "application/json": {
              schema: apiErrorSchema,
              example: {
                error: { code: "CONFLICT", message: "Kategoria ma przypisane transakcje" },
              },
            },
          },
        },
        "500": {
          description: "Nieoczekiwany blad usuwania kategorii (logowany przez console.error)",
          content: {
            "application/json": {
              schema: apiErrorSchema,
              example: { error: { code: "INTERNAL", message: "Nie udalo sie usunac kategorii" } },
            },
          },
        },
      },
    },
  },
};

import {
  apiErrorSchema,
  createTransactionSchema,
  summaryDtoSchema,
  summaryQuerySchema,
  transactionDtoSchema,
  transactionListQuerySchema,
  transactionListResponseSchema,
  updateTransactionSchema,
} from "@expence/types";
import type {
  CategoryDto,
  CreateTransactionFormValues,
  SummaryDto,
  TransactionDto,
  TransactionListResponse,
} from "@expence/types";
import { z } from "zod";
import type { ZodOpenApiPathsObject, ZodOpenApiResponseObject } from "zod-openapi";
import {
  badRequestResponse,
  invalidBodyExample,
  invalidQueryExample,
  malformedJsonExample,
  unauthorizedResponse,
  unhandledErrorResponse,
} from "./responses";

/**
 * Opis endpointow modulu transaction: `/api/transactions`, `/api/transactions/{id}`
 * i `/api/summary`. Statusy odpowiadaja temu, co faktycznie zwracaja route
 * handlery w `src/app/api/{transactions,summary}` - zmiana handlera wymaga zmiany tutaj.
 */

export const TRANSACTIONS_TAG = "transactions";
export const SUMMARY_TAG = "summary";

/*
 * Przyklady dla Swagger UI. Bez nich Swagger generuje wartosci ze schematu, ktore nie
 * przechodza walidacji (`amount: 0` w "Try it out") albo sa absurdalne (daty z roku 7356).
 * `satisfies` pilnuje zgodnosci z kontraktem przy typecheck. Dzien transakcji to poludnie
 * czasu lokalnego (patrz lib/date.ts we frontendzie), stad 10:00Z dla Polski latem.
 */

const exampleFoodCategory = {
  id: "01a08d61-6efb-760c-bd2f-6711e0d26375",
  name: "Jedzenie",
  color: "#ef4444",
  icon: "utensils",
  createdAt: "2026-09-01T08:00:00.000Z",
} satisfies CategoryDto;

const exampleSalaryCategory = {
  id: "01a08d61-6efb-760c-bd2f-6711e0d26374",
  name: "Wynagrodzenie",
  color: "#22c55e",
  icon: "wallet",
  createdAt: "2026-09-01T08:00:00.000Z",
} satisfies CategoryDto;

const exampleTransaction = {
  id: "01a08d61-6f71-740a-b1d0-d56a46c3238f",
  amountCents: 12750,
  type: "EXPENSE",
  description: "Zakupy spozywcze",
  date: "2026-09-10T10:00:00.000Z",
  category: exampleFoodCategory,
  createdAt: "2026-09-10T18:32:05.113Z",
} satisfies TransactionDto;

const exampleSalaryTransaction = {
  id: "01a08d61-6f71-740a-b1d0-d96f2e8aac03",
  amountCents: 850000,
  type: "INCOME",
  description: "Wynagrodzenie",
  date: "2026-09-08T10:00:00.000Z",
  category: exampleSalaryCategory,
  createdAt: "2026-09-08T19:05:41.502Z",
} satisfies TransactionDto;

/** Body w ksztalcie wejsciowym (`z.input`) - kwota jako tekst z przecinkiem, tak jak z formularza. */
const exampleCreateBody = {
  amount: "127,50",
  type: "EXPENSE",
  description: "Zakupy spozywcze",
  date: "2026-09-10T10:00:00.000Z",
  categoryId: exampleFoodCategory.id,
} satisfies CreateTransactionFormValues;

const exampleUpdateBody = {
  amount: "89,00",
  description: "Restauracja",
} satisfies z.input<typeof updateTransactionSchema>;

const exampleList = {
  items: [exampleTransaction, exampleSalaryTransaction],
  page: 1,
  perPage: 10,
  total: 2,
  totals: { incomeCents: 850000, expenseCents: 12750 },
} satisfies TransactionListResponse;

const exampleSummaryByCategory = {
  currency: "PLN",
  totalCents: 33650,
  buckets: [
    {
      key: exampleFoodCategory.id,
      label: "Jedzenie",
      color: "#ef4444",
      totalCents: 21650,
      count: 2,
    },
    {
      key: "01a08d61-6efb-760c-bd2f-6711e0d26376",
      label: "Transport",
      color: "#3b82f6",
      totalCents: 12000,
      count: 1,
    },
  ],
} satisfies SummaryDto;

const exampleSummaryByMonth = {
  currency: "PLN",
  totalCents: 522677,
  buckets: [
    { key: "2026-06", label: "czerwiec 2026", color: null, totalCents: 262638, count: 10 },
    { key: "2026-07", label: "lipiec 2026", color: null, totalCents: 260039, count: 9 },
  ],
} satisfies SummaryDto;

const transactionIdParams = z.object({
  id: z.string().meta({ description: "Id transakcji (UUID v7)", example: exampleTransaction.id }),
});

/** Przyklad `TransactionCategoryNotFoundError` przetlumaczonego przez route handler. */
const categoryNotFoundExample = {
  summary: "Kategoria nie istnieje albo nalezy do innego uzytkownika",
  value: {
    error: {
      code: "BAD_REQUEST",
      message: "Nieprawidlowe dane wejsciowe",
      fields: { categoryId: ["Nie znaleziono kategorii"] },
    },
  },
};

const transactionNotFoundResponse: ZodOpenApiResponseObject = {
  id: "TransactionNotFound",
  description: "Transakcji nie ma albo nalezy do innego uzytkownika (celowo nierozroznialne)",
  content: {
    "application/json": {
      schema: apiErrorSchema,
      example: { error: { code: "NOT_FOUND", message: "Nie znaleziono transakcji" } },
    },
  },
};

const transactionWriteFailedResponse: ZodOpenApiResponseObject = {
  id: "TransactionWriteFailed",
  description: "Nieoczekiwany blad zapisu transakcji (logowany przez console.error)",
  content: {
    "application/json": {
      schema: apiErrorSchema,
      example: { error: { code: "INTERNAL", message: "Nie udalo sie zapisac transakcji" } },
    },
  },
};

export const transactionPaths: ZodOpenApiPathsObject = {
  "/api/transactions": {
    get: {
      tags: [TRANSACTIONS_TAG],
      operationId: "listTransactions",
      summary: "Lista transakcji (stronicowana)",
      description:
        "Strona transakcji zalogowanego uzytkownika, od najnowszej daty. Filtry: zakres dat " +
        "(`dateFrom`/`dateTo`, ISO 8601, wlacznie), `type`, `categoryId`. `totals` liczone sa " +
        "dla calego wyniku filtrow daty i kategorii, ale bez filtra `type`.",
      requestParams: { query: transactionListQuerySchema },
      responses: {
        "200": {
          description: "Strona transakcji z licznikiem i sumami",
          content: {
            "application/json": { schema: transactionListResponseSchema, example: exampleList },
          },
        },
        "400": badRequestResponse({ invalidQuery: invalidQueryExample }),
        "401": unauthorizedResponse,
        "500": unhandledErrorResponse,
      },
    },
    post: {
      tags: [TRANSACTIONS_TAG],
      operationId: "createTransaction",
      summary: "Utworzenie transakcji",
      description:
        'Kwota `amount` przyjmuje liczbe albo tekst z przecinkiem ("12,50") i jest zapisywana ' +
        "w groszach. Kategoria musi nalezec do zalogowanego uzytkownika.",
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: createTransactionSchema, example: exampleCreateBody },
        },
      },
      responses: {
        "201": {
          description: "Utworzona transakcja",
          content: {
            "application/json": { schema: transactionDtoSchema, example: exampleTransaction },
          },
        },
        "400": badRequestResponse({
          invalidBody: invalidBodyExample,
          malformedJson: malformedJsonExample,
          categoryNotFound: categoryNotFoundExample,
        }),
        "401": unauthorizedResponse,
        "500": transactionWriteFailedResponse,
      },
    },
  },
  "/api/transactions/{id}": {
    get: {
      tags: [TRANSACTIONS_TAG],
      operationId: "getTransaction",
      summary: "Pojedyncza transakcja",
      requestParams: { path: transactionIdParams },
      responses: {
        "200": {
          description: "Transakcja z dociagnieta kategoria",
          content: {
            "application/json": { schema: transactionDtoSchema, example: exampleTransaction },
          },
        },
        "401": unauthorizedResponse,
        "404": transactionNotFoundResponse,
        "500": unhandledErrorResponse,
      },
    },
    patch: {
      tags: [TRANSACTIONS_TAG],
      operationId: "updateTransaction",
      summary: "Czesciowa aktualizacja transakcji",
      description:
        "Zmienia tylko przeslane pola; `description: null` czysci opis. Nowa kategoria musi " +
        "nalezec do zalogowanego uzytkownika.",
      requestParams: { path: transactionIdParams },
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: updateTransactionSchema, example: exampleUpdateBody },
        },
      },
      responses: {
        "200": {
          description: "Transakcja po zmianie",
          content: {
            "application/json": { schema: transactionDtoSchema, example: exampleTransaction },
          },
        },
        "400": badRequestResponse({
          invalidBody: invalidBodyExample,
          malformedJson: malformedJsonExample,
          categoryNotFound: categoryNotFoundExample,
        }),
        "401": unauthorizedResponse,
        "404": transactionNotFoundResponse,
        "500": transactionWriteFailedResponse,
      },
    },
    delete: {
      tags: [TRANSACTIONS_TAG],
      operationId: "deleteTransaction",
      summary: "Usuniecie transakcji",
      requestParams: { path: transactionIdParams },
      responses: {
        "204": { description: "Transakcja usunieta - bez ciala odpowiedzi" },
        "401": unauthorizedResponse,
        "404": transactionNotFoundResponse,
        "500": unhandledErrorResponse,
      },
    },
  },
  "/api/summary": {
    get: {
      tags: [SUMMARY_TAG],
      operationId: "getTransactionSummary",
      summary: "Podsumowanie transakcji",
      description:
        "Suma transakcji jednego typu (domyslnie `EXPENSE`) w zakresie dat, pogrupowana po " +
        "kategorii (malejaco po sumie) albo po miesiacu (UTC, chronologicznie). Kwoty w groszach.",
      requestParams: { query: summaryQuerySchema },
      responses: {
        "200": {
          description: "Suma calkowita i koszyki podsumowania",
          content: {
            "application/json": {
              schema: summaryDtoSchema,
              examples: {
                byCategory: { summary: "groupBy=category", value: exampleSummaryByCategory },
                byMonth: { summary: "groupBy=month", value: exampleSummaryByMonth },
              },
            },
          },
        },
        "400": badRequestResponse({ invalidQuery: invalidQueryExample }),
        "401": unauthorizedResponse,
        "500": unhandledErrorResponse,
      },
    },
  },
};

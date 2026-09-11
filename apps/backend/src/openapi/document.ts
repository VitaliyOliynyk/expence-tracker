import {
  apiErrorSchema,
  categoryDtoSchema,
  createTransactionSchema,
  summaryBucketSchema,
  summaryDtoSchema,
  transactionDtoSchema,
  transactionListResponseSchema,
  transactionTotalsSchema,
  updateTransactionSchema,
} from "@expence/types";
import { createDocument } from "zod-openapi";
import { SUMMARY_TAG, TRANSACTIONS_TAG, transactionPaths } from "./transaction.paths";

/**
 * Specyfikacja OpenAPI 3.1 backendu, budowana ze schematow Zod z `@expence/types` -
 * tych samych, ktorymi route handlery waliduja body i query, wiec dokumentacja nie
 * rozjedzie sie z walidacja. Na razie obejmuje modul transaction.
 */

type OpenApiDocument = ReturnType<typeof createDocument>;

let cachedDocument: OpenApiDocument | undefined;

/**
 * Buduje specyfikacje przy pierwszym wywolaniu i trzyma ja w pamieci procesu.
 *
 * @returns Dokument OpenAPI 3.1 gotowy do serializacji do JSON-a.
 * @throws {Error} gdy ktoregos schematu Zod nie da sie przedstawic w JSON Schema
 *   (np. `z.custom()` bez metadanych) - blad konfiguracji, nie danych.
 */
export function getOpenApiDocument(): OpenApiDocument {
  cachedDocument ??= createDocument(
    {
      openapi: "3.1.0",
      info: {
        title: "Expence Tracker API",
        version: "0.1.0",
        description:
          "Backend Expence Tracker. Chronione endpointy wymagaja naglowka " +
          "`Authorization: Bearer <token>`; token (JWT HS256, wazny 10 minut) zwraca " +
          "`POST /api/auth/login`. Kwoty sa liczbami calkowitymi w groszach.",
      },
      tags: [
        { name: TRANSACTIONS_TAG, description: "Przychody i wydatki zalogowanego uzytkownika" },
        { name: SUMMARY_TAG, description: "Podsumowania transakcji po kategorii albo miesiacu" },
      ],
      security: [{ bearerAuth: [] }],
      paths: transactionPaths,
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "Token z POST /api/auth/login (albo /api/token we frontendzie)",
          },
        },
        schemas: {
          ApiError: apiErrorSchema,
          CategoryDto: categoryDtoSchema,
          TransactionDto: transactionDtoSchema,
          TransactionTotals: transactionTotalsSchema,
          TransactionListResponse: transactionListResponseSchema,
          CreateTransactionInput: createTransactionSchema,
          UpdateTransactionInput: updateTransactionSchema,
          SummaryBucket: summaryBucketSchema,
          SummaryDto: summaryDtoSchema,
        },
      },
    },
    {
      // Zod w kontekscie output dokleja obiektom `additionalProperties: false`, przez co
      // kazdy DTO z components.schemas lezalby w spec dwa razy (X i nieuzywany XOutput).
      // Schematy z transformacja nadal dostana osobny wariant *Output.
      override: ({ jsonSchema, io }) => {
        if (io === "output" && jsonSchema.additionalProperties === false) {
          delete jsonSchema.additionalProperties;
        }
      },
    },
  );
  return cachedDocument;
}

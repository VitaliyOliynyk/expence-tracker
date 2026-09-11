import {
  apiErrorSchema,
  authResponseSchema,
  categoryDtoSchema,
  createCategorySchema,
  createTransactionSchema,
  loginSchema,
  registerSchema,
  summaryBucketSchema,
  summaryDtoSchema,
  transactionDtoSchema,
  transactionListResponseSchema,
  transactionTotalsSchema,
  updateCategorySchema,
  updateTransactionSchema,
  userDtoSchema,
} from "@expence/types";
import { createDocument } from "zod-openapi";
import { AUTH_TAG, authPaths } from "./auth.paths";
import { CATEGORIES_TAG, categoryPaths } from "./category.paths";
import { SYSTEM_TAG, systemPaths } from "./system.paths";
import { SUMMARY_TAG, TRANSACTIONS_TAG, transactionPaths } from "./transaction.paths";

/**
 * Specyfikacja OpenAPI 3.1 backendu, budowana ze schematow Zod z `@expence/types` -
 * tych samych, ktorymi route handlery waliduja body i query, wiec dokumentacja nie
 * rozjedzie sie z walidacja. Obejmuje wszystkie route handlery z `src/app/api`.
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
        { name: AUTH_TAG, description: "Rejestracja, logowanie (token dostepu) i profil" },
        { name: TRANSACTIONS_TAG, description: "Przychody i wydatki zalogowanego uzytkownika" },
        { name: SUMMARY_TAG, description: "Podsumowania transakcji po kategorii albo miesiacu" },
        { name: CATEGORIES_TAG, description: "Kategorie transakcji zalogowanego uzytkownika" },
        { name: SYSTEM_TAG, description: "Healthcheck i sama dokumentacja API" },
      ],
      // Domyslnie kazdy endpoint wymaga tokenu; publiczne nadpisuja to przez `security: []`.
      security: [{ bearerAuth: [] }],
      paths: { ...authPaths, ...transactionPaths, ...categoryPaths, ...systemPaths },
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
          UserDto: userDtoSchema,
          AuthResponse: authResponseSchema,
          RegisterInput: registerSchema,
          LoginInput: loginSchema,
          CategoryDto: categoryDtoSchema,
          CreateCategoryInput: createCategorySchema,
          UpdateCategoryInput: updateCategorySchema,
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

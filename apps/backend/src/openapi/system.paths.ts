import { z } from "zod";
import type { ZodOpenApiPathsObject } from "zod-openapi";

/**
 * Opis publicznych endpointow technicznych: `/api/health`, `/api/openapi.json`
 * i `/api/docs` (wszystkie w PUBLIC_PATHS w `proxy.ts`, stad `security: []`).
 */

export const SYSTEM_TAG = "system";

/*
 * Ksztalt odpowiedzi healthchecku - tylko na potrzeby dokumentacji, bo nie konsumuje
 * go zaden formularz ani `api-client.ts`, wiec nie jest czescia kontraktu `@expence/types`.
 */
const healthResponseSchema = z
  .object({
    status: z.enum(["ok", "degraded"]),
    database: z.enum(["up", "down"]),
  })
  .meta({ id: "HealthStatus" });

export const systemPaths: ZodOpenApiPathsObject = {
  "/api/health": {
    get: {
      tags: [SYSTEM_TAG],
      operationId: "getHealth",
      summary: "Healthcheck",
      description: "Sprawdza, czy backend dziala i czy odpowiada baza (`SELECT 1`).",
      security: [],
      responses: {
        "200": {
          description: "Backend i baza dzialaja",
          content: {
            "application/json": {
              schema: healthResponseSchema,
              example: { status: "ok", database: "up" },
            },
          },
        },
        "503": {
          description: "Backend dziala, ale baza nie odpowiada",
          content: {
            "application/json": {
              schema: healthResponseSchema,
              example: { status: "degraded", database: "down" },
            },
          },
        },
      },
    },
  },
  "/api/openapi.json": {
    get: {
      tags: [SYSTEM_TAG],
      operationId: "getOpenApiDocument",
      summary: "Specyfikacja OpenAPI 3.1",
      description: "Ten dokument w JSON-ie - zrodlo dla Swagger UI pod `/api/docs`.",
      security: [],
      responses: {
        "200": {
          description: "Dokument OpenAPI 3.1",
          content: { "application/json": {} },
        },
      },
    },
  },
  "/api/docs": {
    get: {
      tags: [SYSTEM_TAG],
      operationId: "getSwaggerUi",
      summary: "Swagger UI",
      description: "Strona HTML ze Swagger UI czytajacym `/api/openapi.json`.",
      security: [],
      responses: {
        "200": {
          description: "Strona HTML",
          content: { "text/html": {} },
        },
      },
    },
  },
};

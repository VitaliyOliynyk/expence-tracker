import { ok } from "@/lib/http";
import { getOpenApiDocument } from "@/openapi/document";

/**
 * Publiczna specyfikacja OpenAPI 3.1 (zrodlo dla Swagger UI pod /api/docs).
 *
 * @returns 200 z dokumentem OpenAPI w JSON-ie.
 * @throws {Error} gdy specyfikacji nie da sie zbudowac - Next zwraca wtedy 500.
 */
export function GET() {
  return ok(getOpenApiDocument());
}

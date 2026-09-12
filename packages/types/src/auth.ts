import { z } from "zod";

/*
 * `.meta()` na polach to opisy i przyklady w specyfikacji OpenAPI backendu (Swagger UI).
 * Bez `id` - nazwy komponentow nadaje apps/backend/src/openapi/document.ts. Pola wskazujace
 * zarejestrowany DTO (np. `user`) zostaja bez `.meta()`, zeby w spec zostal `$ref`.
 */

export const userDtoSchema = z.object({
  id: z.uuid().meta({
    description: "Id uzytkownika (UUID v7)",
    example: "01a08d61-6e9a-7c31-a2f4-2b8c5d7e9f10",
  }),
  name: z.string().nullable().meta({ description: "Imie wyswietlane w UI", example: "Jan" }),
  email: z.email().meta({
    description: "Adres e-mail (zapisywany malymi literami)",
    example: "jan@example.com",
  }),
  image: z.string().nullable().meta({ description: "Adres obrazka profilu; `null`, gdy brak" }),
  createdAt: z.iso.datetime().meta({
    description: "Chwila zalozenia konta (ISO 8601, UTC)",
    example: "2026-09-01T08:00:00.000Z",
  }),
});
export type UserDto = z.infer<typeof userDtoSchema>;

export const passwordSchema = z
  .string()
  .min(8, "Haslo musi miec co najmniej 8 znakow")
  .max(128)
  .meta({ description: "Haslo, 8-128 znakow", example: "tajnehaslo" });

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Imie jest wymagane")
    .max(64)
    .meta({ description: "Imie, 1-64 znaki (przycinane)", example: "Jan" }),
  email: z.email("Nieprawidlowy adres e-mail").trim().toLowerCase().meta({
    description: "Adres e-mail; przycinany i zamieniany na male litery",
    example: "jan@example.com",
  }),
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

// Przy logowaniu nie powtarzamy reguly dlugosci hasla - dla kont zalozonych
// przed jej zmiana dawaloby to 400 zamiast 401.
export const loginSchema = z.object({
  email: z.email("Nieprawidlowy adres e-mail").trim().toLowerCase().meta({
    description: "Adres e-mail; przycinany i zamieniany na male litery",
    example: "dev@expence.local",
  }),
  password: z
    .string()
    .min(1, "Haslo jest wymagane")
    .meta({ description: "Haslo (bez reguly dlugosci)", example: "dev12345" }),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const authResponseSchema = z.object({
  user: userDtoSchema,
  token: z.string().meta({
    description:
      "Token dostepu: JWT HS256 (`sub` = id uzytkownika), wazny 10 minut; " +
      "do naglowka `Authorization: Bearer`",
  }),
  expiresAt: z.number().meta({
    description: "Chwila wygasniecia tokenu w milisekundach od epoki Unix",
    example: 1789032600000,
  }),
});
export type AuthResponse = z.infer<typeof authResponseSchema>;

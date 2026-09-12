import { z } from "zod";

/** Jednolity ksztalt bledu zwracany przez kazdy route handler w apps/backend. */
export const apiErrorSchema = z.object({
  error: z.object({
    code: z
      .enum(["BAD_REQUEST", "UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "CONFLICT", "INTERNAL"])
      .meta({
        description:
          "Kod bledu; status HTTP wynika z kodu (BAD_REQUEST 400, UNAUTHORIZED 401, " +
          "FORBIDDEN 403, NOT_FOUND 404, CONFLICT 409, INTERNAL 500)",
      }),
    message: z
      .string()
      .meta({ description: "Komunikat dla czlowieka", example: "Nieprawidlowe dane wejsciowe" }),
    fields: z
      .record(z.string(), z.array(z.string()))
      .optional()
      .meta({ description: "Mapa pole -> komunikaty, wypelniana przy bledach walidacji Zod" }),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;
export type ApiErrorCode = ApiError["error"]["code"];

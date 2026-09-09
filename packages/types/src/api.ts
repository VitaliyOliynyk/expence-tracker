import { z } from "zod";

/** Jednolity ksztalt bledu zwracany przez kazdy route handler w apps/backend. */
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.enum(["BAD_REQUEST", "UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "CONFLICT", "INTERNAL"]),
    message: z.string(),
    /** Mapa pole -> komunikaty, wypelniana przy bledach walidacji Zod. */
    fields: z.record(z.string(), z.array(z.string())).optional(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;
export type ApiErrorCode = ApiError["error"]["code"];

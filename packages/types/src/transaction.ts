import { z } from "zod";
import { amountCentsSchema, amountInputSchema } from "./money";
import { categoryDtoSchema } from "./category";

// `.meta()` na polach - opisy w spec OpenAPI backendu (zasady: komentarz w auth.ts).

export const TRANSACTION_TYPES = ["INCOME", "EXPENSE"] as const;
export const transactionTypeSchema = z
  .enum(TRANSACTION_TYPES)
  .meta({ description: "`INCOME` - przychod, `EXPENSE` - wydatek", example: "EXPENSE" });
export type TransactionType = z.infer<typeof transactionTypeSchema>;

export const transactionDtoSchema = z.object({
  id: z.uuid().meta({
    description: "Id transakcji (UUID v7)",
    example: "01a08d61-6f71-740a-b1d0-d56a46c3238f",
  }),
  amountCents: amountCentsSchema.meta({
    description: "Kwota w groszach, zawsze dodatnia - przychod czy wydatek mowi `type`",
    example: 12750,
  }),
  type: transactionTypeSchema,
  description: z
    .string()
    .nullable()
    .meta({ description: "Opis; `null`, gdy brak", example: "Zakupy spozywcze" }),
  date: z.iso.datetime().meta({
    description: "Dzien transakcji (ISO 8601, UTC); UI zapisuje poludnie czasu lokalnego",
    example: "2026-09-10T10:00:00.000Z",
  }),
  category: categoryDtoSchema,
  createdAt: z.iso.datetime().meta({
    description: "Chwila zapisu transakcji (ISO 8601, UTC)",
    example: "2026-09-10T18:32:05.113Z",
  }),
});
export type TransactionDto = z.infer<typeof transactionDtoSchema>;

/** Wspolne dla formularza (react-hook-form) i dla walidacji body w backendzie. */
export const createTransactionSchema = z.object({
  amount: amountInputSchema,
  type: transactionTypeSchema,
  description: z.string().trim().max(280, "Opis moze miec najwyzej 280 znakow").nullish().meta({
    description: "Opis, max 280 znakow (przycinany); `null` czysci opis",
    example: "Zakupy spozywcze",
  }),
  date: z.iso.datetime({ error: "Podaj date" }).meta({
    description: "Dzien transakcji (ISO 8601 z `Z`; przesuniecie strefy jest odrzucane)",
    example: "2026-09-10T10:00:00.000Z",
  }),
  categoryId: z.uuid({ error: "Wybierz kategorie" }).meta({
    description: "Id kategorii; musi nalezec do zalogowanego uzytkownika",
    example: "01a08d61-6efb-760c-bd2f-6711e0d26375",
  }),
});
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
/** Ksztalt PRZED walidacja - to trzyma react-hook-form (kwota jako tekst z inputa). */
export type CreateTransactionFormValues = z.input<typeof createTransactionSchema>;

export const updateTransactionSchema = createTransactionSchema.partial();
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

export const transactionListQuerySchema = z
  .object({
    dateFrom: z.iso.datetime().optional().meta({
      description: "Poczatek zakresu dat, wlacznie (ISO 8601 z `Z`)",
      example: "2026-09-01T00:00:00.000Z",
    }),
    dateTo: z.iso.datetime().optional().meta({
      description: "Koniec zakresu dat, wlacznie (ISO 8601 z `Z`)",
      example: "2026-09-30T23:59:59.999Z",
    }),
    type: transactionTypeSchema
      .optional()
      .meta({ description: "Filtr typu; nie wplywa na `totals`" }),
    categoryId: z.uuid().optional().meta({ description: "Filtr kategorii" }),
    page: z.coerce.number().int().min(1).default(1).meta({ description: "Numer strony, od 1" }),
    perPage: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(10)
      .meta({ description: "Rozmiar strony, 1-100" }),
  })
  .refine((q) => !q.dateFrom || !q.dateTo || q.dateFrom <= q.dateTo, {
    message: "Data 'dateFrom' musi byc wczesniejsza niz 'dateTo'",
    path: ["dateFrom"],
  });
export type TransactionListQuery = z.infer<typeof transactionListQuerySchema>;

/**
 * Sumy dla calego wyniku filtrow (nie tylko biezacej strony). Liczone z filtrami
 * daty i kategorii, ale bez filtra `type` - karty podsumowania pokazuja obie strony.
 */
export const transactionTotalsSchema = z.object({
  incomeCents: z.int().meta({ description: "Suma przychodow w groszach", example: 850000 }),
  expenseCents: z.int().meta({ description: "Suma wydatkow w groszach", example: 12750 }),
});
export type TransactionTotals = z.infer<typeof transactionTotalsSchema>;

export const transactionListResponseSchema = z.object({
  items: z.array(transactionDtoSchema).meta({ description: "Transakcje biezacej strony" }),
  page: z.int().meta({ description: "Numer strony", example: 1 }),
  perPage: z.int().meta({ description: "Rozmiar strony", example: 10 }),
  total: z.int().meta({
    description: "Liczba transakcji pasujacych do wszystkich filtrow (do stronicowania)",
    example: 2,
  }),
  totals: transactionTotalsSchema,
});
export type TransactionListResponse = z.infer<typeof transactionListResponseSchema>;

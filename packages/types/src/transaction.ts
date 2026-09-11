import { z } from "zod";
import { amountCentsSchema, amountInputSchema } from "./money";
import { categoryDtoSchema } from "./category";

export const TRANSACTION_TYPES = ["INCOME", "EXPENSE"] as const;
export const transactionTypeSchema = z.enum(TRANSACTION_TYPES);
export type TransactionType = z.infer<typeof transactionTypeSchema>;

export const transactionDtoSchema = z.object({
  id: z.uuid(),
  // Zawsze dodatnia - to, czy to przychod czy wydatek, mowi `type`.
  amountCents: amountCentsSchema,
  type: transactionTypeSchema,
  description: z.string().nullable(),
  date: z.iso.datetime(),
  category: categoryDtoSchema,
  createdAt: z.iso.datetime(),
});
export type TransactionDto = z.infer<typeof transactionDtoSchema>;

/** Wspolne dla formularza (react-hook-form) i dla walidacji body w backendzie. */
export const createTransactionSchema = z.object({
  amount: amountInputSchema,
  type: transactionTypeSchema,
  description: z.string().trim().max(280, "Opis moze miec najwyzej 280 znakow").nullish(),
  date: z.iso.datetime({ error: "Podaj date" }),
  categoryId: z.uuid({ error: "Wybierz kategorie" }),
});
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
/** Ksztalt PRZED walidacja - to trzyma react-hook-form (kwota jako tekst z inputa). */
export type CreateTransactionFormValues = z.input<typeof createTransactionSchema>;

export const updateTransactionSchema = createTransactionSchema.partial();
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

export const transactionListQuerySchema = z
  .object({
    dateFrom: z.iso.datetime().optional(),
    dateTo: z.iso.datetime().optional(),
    type: transactionTypeSchema.optional(),
    categoryId: z.uuid().optional(),
    page: z.coerce.number().int().min(1).default(1),
    perPage: z.coerce.number().int().min(1).max(100).default(10),
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
  incomeCents: z.int(),
  expenseCents: z.int(),
});
export type TransactionTotals = z.infer<typeof transactionTotalsSchema>;

export const transactionListResponseSchema = z.object({
  items: z.array(transactionDtoSchema),
  page: z.int(),
  perPage: z.int(),
  total: z.int(),
  totals: transactionTotalsSchema,
});
export type TransactionListResponse = z.infer<typeof transactionListResponseSchema>;

import { z } from "zod";
import { amountCentsSchema, amountInputSchema, currencySchema, DEFAULT_CURRENCY } from "./money.js";
import { categoryDtoSchema } from "./category.js";

export const expenseDtoSchema = z.object({
  id: z.uuid(),
  amountCents: amountCentsSchema,
  currency: currencySchema,
  description: z.string().nullable(),
  spentAt: z.iso.datetime(),
  category: categoryDtoSchema.nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type ExpenseDto = z.infer<typeof expenseDtoSchema>;

/** Wspolne dla formularza (react-hook-form) i dla walidacji body w backendzie. */
export const createExpenseSchema = z.object({
  amount: amountInputSchema,
  currency: currencySchema.default(DEFAULT_CURRENCY),
  description: z.string().trim().max(280).nullish(),
  spentAt: z.iso.datetime(),
  categoryId: z.uuid().nullish(),
});
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
/** Ksztalt PRZED walidacja - to trzyma react-hook-form (kwota jako tekst z inputa). */
export type CreateExpenseFormValues = z.input<typeof createExpenseSchema>;

export const updateExpenseSchema = createExpenseSchema.partial();
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;

export const EXPENSE_SORT_FIELDS = ["spentAt", "amountCents", "createdAt"] as const;

export const expenseListQuerySchema = z
  .object({
    from: z.iso.datetime().optional(),
    to: z.iso.datetime().optional(),
    categoryId: z.uuid().optional(),
    search: z.string().trim().max(120).optional(),
    sort: z.enum(EXPENSE_SORT_FIELDS).default("spentAt"),
    order: z.enum(["asc", "desc"]).default("desc"),
    page: z.coerce.number().int().min(1).default(1),
    perPage: z.coerce.number().int().min(1).max(100).default(25),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: "Data 'from' musi byc wczesniejsza niz 'to'",
    path: ["from"],
  });
export type ExpenseListQuery = z.infer<typeof expenseListQuerySchema>;

export const expenseListResponseSchema = z.object({
  items: z.array(expenseDtoSchema),
  page: z.int(),
  perPage: z.int(),
  total: z.int(),
  totalCents: z.int(),
});
export type ExpenseListResponse = z.infer<typeof expenseListResponseSchema>;

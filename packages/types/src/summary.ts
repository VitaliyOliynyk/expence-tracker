import { z } from "zod";
import { currencySchema } from "./money";
import { transactionTypeSchema } from "./transaction";

/** Podsumowanie transakcji jednego typu (domyslnie wydatkow) w przedziale dat. */
export const summaryQuerySchema = z
  .object({
    dateFrom: z.iso.datetime().optional(),
    dateTo: z.iso.datetime().optional(),
    type: transactionTypeSchema.default("EXPENSE"),
    groupBy: z.enum(["category", "month"]).default("category"),
  })
  .refine((q) => !q.dateFrom || !q.dateTo || q.dateFrom <= q.dateTo, {
    message: "Data 'dateFrom' musi byc wczesniejsza niz 'dateTo'",
    path: ["dateFrom"],
  });
export type SummaryQuery = z.infer<typeof summaryQuerySchema>;

export const summaryBucketSchema = z.object({
  /** id kategorii lub "YYYY-MM" przy groupBy=month */
  key: z.string(),
  label: z.string(),
  color: z.string().nullable(),
  totalCents: z.int(),
  count: z.int(),
});
export type SummaryBucket = z.infer<typeof summaryBucketSchema>;

export const summaryDtoSchema = z.object({
  currency: currencySchema,
  totalCents: z.int(),
  buckets: z.array(summaryBucketSchema),
});
export type SummaryDto = z.infer<typeof summaryDtoSchema>;

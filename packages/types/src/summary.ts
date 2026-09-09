import { z } from "zod";
import { currencySchema } from "./money.js";

export const summaryQuerySchema = z.object({
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
  groupBy: z.enum(["category", "month"]).default("category"),
});
export type SummaryQuery = z.infer<typeof summaryQuerySchema>;

export const summaryBucketSchema = z.object({
  /** id kategorii lub "YYYY-MM" przy groupBy=month; null = wydatki bez kategorii */
  key: z.string().nullable(),
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

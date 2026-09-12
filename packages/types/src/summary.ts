import { z } from "zod";
import { currencySchema } from "./money";
import { transactionTypeSchema } from "./transaction";

// `.meta()` na polach - opisy w spec OpenAPI backendu (zasady: komentarz w auth.ts).

/** Podsumowanie transakcji jednego typu (domyslnie wydatkow) w przedziale dat. */
export const summaryQuerySchema = z
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
      .default("EXPENSE")
      .meta({ description: "Typ sumowanych transakcji" }),
    groupBy: z.enum(["category", "month"]).default("category").meta({
      description:
        "`category` - po kategorii (malejaco po sumie), `month` - po miesiacu UTC (chronologicznie)",
    }),
  })
  .refine((q) => !q.dateFrom || !q.dateTo || q.dateFrom <= q.dateTo, {
    message: "Data 'dateFrom' musi byc wczesniejsza niz 'dateTo'",
    path: ["dateFrom"],
  });
export type SummaryQuery = z.infer<typeof summaryQuerySchema>;

export const summaryBucketSchema = z.object({
  key: z.string().meta({
    description: "Id kategorii albo `YYYY-MM` przy `groupBy=month`",
    example: "01a08d61-6efb-760c-bd2f-6711e0d26375",
  }),
  label: z.string().meta({
    description: "Nazwa kategorii albo miesiac (pl-PL, UTC), np. `wrzesien 2026`",
    example: "Jedzenie",
  }),
  color: z.string().nullable().meta({
    description: "Kolor kategorii (#rrggbb); `null` przy `groupBy=month`",
    example: "#ef4444",
  }),
  totalCents: z.int().meta({ description: "Suma w groszach", example: 21650 }),
  count: z.int().meta({ description: "Liczba transakcji w koszyku", example: 2 }),
});
export type SummaryBucket = z.infer<typeof summaryBucketSchema>;

export const summaryDtoSchema = z.object({
  currency: currencySchema,
  totalCents: z.int().meta({ description: "Suma wszystkich koszykow w groszach", example: 33650 }),
  buckets: z.array(summaryBucketSchema).meta({ description: "Koszyki podsumowania" }),
});
export type SummaryDto = z.infer<typeof summaryDtoSchema>;

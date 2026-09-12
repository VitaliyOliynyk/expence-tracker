import { z } from "zod";

// `.meta()` na polach - opisy w spec OpenAPI backendu (zasady: komentarz w auth.ts).

/** Kolor w formacie #rrggbb - uzywany do oznaczen kategorii w UI i na wykresach. */
export const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Kolor musi byc w formacie #rrggbb")
  .meta({ description: "Kolor w formacie #rrggbb", example: "#ef4444" });

export const categoryDtoSchema = z.object({
  id: z.uuid().meta({
    description: "Id kategorii (UUID v7)",
    example: "01a08d61-6efb-760c-bd2f-6711e0d26375",
  }),
  name: z
    .string()
    .meta({ description: "Nazwa, unikalna w obrebie uzytkownika", example: "Jedzenie" }),
  color: hexColorSchema,
  icon: z
    .string()
    .nullable()
    .meta({ description: "Nazwa ikony `lucide-react`; `null`, gdy brak", example: "utensils" }),
  createdAt: z.iso.datetime().meta({
    description: "Chwila utworzenia kategorii (ISO 8601, UTC)",
    example: "2026-09-01T08:00:00.000Z",
  }),
});
export type CategoryDto = z.infer<typeof categoryDtoSchema>;

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Nazwa jest wymagana").max(48).meta({
    description: "Nazwa, 1-48 znakow (przycinana); unikalna w obrebie uzytkownika",
    example: "Jedzenie",
  }),
  color: hexColorSchema
    .default("#64748b")
    .meta({ description: "Kolor w formacie #rrggbb; domyslnie `#64748b`", example: "#ef4444" }),
  icon: z.string().trim().max(32).nullish().meta({
    description: "Nazwa ikony `lucide-react`, max 32 znaki; `null` usuwa ikone",
    example: "utensils",
  }),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
/** Ksztalt PRZED walidacja - to trzyma react-hook-form (color opcjonalny, ma default). */
export type CreateCategoryFormValues = z.input<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema.partial();
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

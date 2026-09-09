import { z } from "zod";

/** Kolor w formacie #rrggbb - uzywany do oznaczen kategorii w UI i na wykresach. */
export const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Kolor musi byc w formacie #rrggbb");

export const categoryDtoSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  color: hexColorSchema,
  icon: z.string().nullable(),
  createdAt: z.iso.datetime(),
});
export type CategoryDto = z.infer<typeof categoryDtoSchema>;

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Nazwa jest wymagana").max(48),
  color: hexColorSchema.default("#64748b"),
  icon: z.string().trim().max(32).nullish(),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema.partial();
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

import type { Category } from "@expence/db";
import type { CategoryDto } from "@expence/types";

/**
 * Mapuje rekord kategorii z Prismy na DTO z kontraktu `@expence/types`.
 * Pomija `userId` i `updatedAt` - nie sa czescia kontraktu API.
 *
 * Nie rzuca wyjatkow - `createdAt` z bazy jest zawsze poprawna data.
 *
 * @param category - rekord kategorii z bazy.
 * @returns DTO kategorii z `createdAt` w formacie ISO 8601.
 */
export function toCategoryDto(category: Category): CategoryDto {
  return {
    id: category.id,
    name: category.name,
    color: category.color,
    icon: category.icon,
    createdAt: category.createdAt.toISOString(),
  };
}

import type { Category } from "@expence/db";
import type { CategoryDto } from "@expence/types";

export function toCategoryDto(category: Category): CategoryDto {
  return {
    id: category.id,
    name: category.name,
    color: category.color,
    icon: category.icon,
    createdAt: category.createdAt.toISOString(),
  };
}

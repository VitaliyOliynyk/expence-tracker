import { prisma } from "@expence/db";
import type { CategoryDto, CreateCategoryInput, UpdateCategoryInput } from "@expence/types";
import { toCategoryDto } from "../mappers";

/** Kategoria ma przypisane transakcje (FK Transaction.categoryId z onDelete: Restrict). */
export class CategoryInUseError extends Error {
  constructor(id: string) {
    super(`Kategoria ${id} ma przypisane transakcje`);
    this.name = "CategoryInUseError";
  }
}

export async function listCategories(userId: string): Promise<CategoryDto[]> {
  const categories = await prisma.category.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
  return categories.map(toCategoryDto);
}

export async function createCategory(
  userId: string,
  input: CreateCategoryInput,
): Promise<CategoryDto> {
  const category = await prisma.category.create({
    data: {
      userId,
      name: input.name,
      color: input.color,
      icon: input.icon ?? null,
    },
  });
  return toCategoryDto(category);
}

export async function updateCategory(
  userId: string,
  id: string,
  input: UpdateCategoryInput,
): Promise<CategoryDto | null> {
  const { count } = await prisma.category.updateMany({
    where: { id, userId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
      ...(input.icon !== undefined ? { icon: input.icon ?? null } : {}),
    },
  });
  if (count === 0) return null;

  const category = await prisma.category.findFirst({ where: { id, userId } });
  return category ? toCategoryDto(category) : null;
}

export async function deleteCategory(userId: string, id: string): Promise<boolean> {
  try {
    const { count } = await prisma.category.deleteMany({ where: { id, userId } });
    return count > 0;
  } catch (error) {
    // P2003 = naruszenie klucza obcego - kategorie trzymaja transakcje (Restrict).
    if (error && typeof error === "object" && "code" in error && error.code === "P2003") {
      throw new CategoryInUseError(id);
    }
    throw error;
  }
}

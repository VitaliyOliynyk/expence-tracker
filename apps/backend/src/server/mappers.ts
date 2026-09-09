import type { Category, Expense } from "@expence/db";
import type { CategoryDto, Currency, ExpenseDto } from "@expence/types";

export function toCategoryDto(category: Category): CategoryDto {
  return {
    id: category.id,
    name: category.name,
    color: category.color,
    icon: category.icon,
    createdAt: category.createdAt.toISOString(),
  };
}

export function toExpenseDto(expense: Expense & { category: Category | null }): ExpenseDto {
  return {
    id: expense.id,
    amountCents: expense.amountCents,
    currency: expense.currency as Currency,
    description: expense.description,
    spentAt: expense.spentAt.toISOString(),
    category: expense.category ? toCategoryDto(expense.category) : null,
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
  };
}

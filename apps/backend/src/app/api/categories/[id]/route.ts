import { updateCategorySchema } from "@expence/types";
import { requireUserId } from "@/lib/auth-context";
import { fail, noContent, ok, parseJsonBody } from "@/lib/http";
import {
  CategoryInUseError,
  deleteCategory,
  updateCategory,
} from "@/server/services/category.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = requireUserId(request);
  if (auth.error) return auth.error;

  const body = await parseJsonBody(request, updateCategorySchema);
  if (body.error) return body.error;

  const { id } = await params;
  const category = await updateCategory(auth.userId, id, body.data);
  return category ? ok(category) : fail("NOT_FOUND", "Nie znaleziono kategorii");
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const auth = requireUserId(request);
  if (auth.error) return auth.error;

  const { id } = await params;
  try {
    const deleted = await deleteCategory(auth.userId, id);
    return deleted ? noContent() : fail("NOT_FOUND", "Nie znaleziono kategorii");
  } catch (error) {
    if (error instanceof CategoryInUseError) {
      return fail("CONFLICT", "Kategoria ma przypisane transakcje");
    }
    console.error("DELETE /api/categories/[id]", error);
    return fail("INTERNAL", "Nie udalo sie usunac kategorii");
  }
}

import { createCategorySchema } from "@expence/types";
import { requireUserId } from "@/lib/auth-context";
import { created, fail, ok, parseJsonBody } from "@/lib/http";
import { createCategory, listCategories } from "@/server/services/category.service";

export async function GET(request: Request) {
  const auth = requireUserId(request);
  if (auth.error) return auth.error;

  return ok(await listCategories(auth.userId));
}

export async function POST(request: Request) {
  const auth = requireUserId(request);
  if (auth.error) return auth.error;

  const body = await parseJsonBody(request, createCategorySchema);
  if (body.error) return body.error;

  try {
    return created(await createCategory(auth.userId, body.data));
  } catch (error) {
    // @@unique([userId, name]) - powtorzona nazwa kategorii u tego samego uzytkownika.
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return fail("CONFLICT", "Kategoria o tej nazwie juz istnieje");
    }
    console.error("POST /api/categories", error);
    return fail("INTERNAL", "Nie udalo sie zapisac kategorii");
  }
}

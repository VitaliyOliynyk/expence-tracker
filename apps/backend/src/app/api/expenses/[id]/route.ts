import { updateExpenseSchema } from "@expence/types";
import { requireUserId } from "@/lib/auth-context";
import { fail, noContent, ok, parseJsonBody } from "@/lib/http";
import { deleteExpense, getExpense, updateExpense } from "@/server/services/expense.service";

// W Next 15+ `params` jest asynchroniczne.
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const auth = requireUserId(request);
  if (auth.error) return auth.error;

  const { id } = await params;
  const expense = await getExpense(auth.userId, id);
  return expense ? ok(expense) : fail("NOT_FOUND", "Nie znaleziono wydatku");
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = requireUserId(request);
  if (auth.error) return auth.error;

  const body = await parseJsonBody(request, updateExpenseSchema);
  if (body.error) return body.error;

  const { id } = await params;
  const expense = await updateExpense(auth.userId, id, body.data);
  return expense ? ok(expense) : fail("NOT_FOUND", "Nie znaleziono wydatku");
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const auth = requireUserId(request);
  if (auth.error) return auth.error;

  const { id } = await params;
  const deleted = await deleteExpense(auth.userId, id);
  return deleted ? noContent() : fail("NOT_FOUND", "Nie znaleziono wydatku");
}

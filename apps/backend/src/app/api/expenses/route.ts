import { createExpenseSchema, expenseListQuerySchema } from "@expence/types";
import { requireUserId } from "@/lib/auth-context";
import { created, fail, ok, parseJsonBody, parseQuery } from "@/lib/http";
import { createExpense, listExpenses } from "@/server/services/expense.service";

export async function GET(request: Request) {
  const auth = requireUserId(request);
  if (auth.error) return auth.error;

  const query = parseQuery(request, expenseListQuerySchema);
  if (query.error) return query.error;

  return ok(await listExpenses(auth.userId, query.data));
}

export async function POST(request: Request) {
  const auth = requireUserId(request);
  if (auth.error) return auth.error;

  const body = await parseJsonBody(request, createExpenseSchema);
  if (body.error) return body.error;

  try {
    return created(await createExpense(auth.userId, body.data));
  } catch (error) {
    console.error("POST /api/expenses", error);
    return fail("INTERNAL", "Nie udalo sie zapisac wydatku");
  }
}

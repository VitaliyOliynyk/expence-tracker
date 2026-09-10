import { updateTransactionSchema } from "@expence/types";
import { requireUserId } from "@/lib/auth-context";
import { fail, noContent, ok, parseJsonBody } from "@/lib/http";
import { dispatch } from "@/server/bus";
import {
  DeleteTransactionCommand,
  GetTransactionQuery,
  UpdateTransactionCommand,
} from "@/server/modules/transaction/transaction.messages";
import { TransactionCategoryNotFoundError } from "@/server/modules/transaction/transaction.errors";

// W Next 15+ `params` jest asynchroniczne.
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const auth = requireUserId(request);
  if (auth.error) return auth.error;

  const { id } = await params;
  const transaction = await dispatch(GetTransactionQuery({ userId: auth.userId, id }));
  return transaction ? ok(transaction) : fail("NOT_FOUND", "Nie znaleziono transakcji");
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = requireUserId(request);
  if (auth.error) return auth.error;

  const body = await parseJsonBody(request, updateTransactionSchema);
  if (body.error) return body.error;

  const { id } = await params;
  try {
    const transaction = await dispatch(
      UpdateTransactionCommand({ userId: auth.userId, id, input: body.data }),
    );
    return transaction ? ok(transaction) : fail("NOT_FOUND", "Nie znaleziono transakcji");
  } catch (error) {
    if (error instanceof TransactionCategoryNotFoundError) {
      return fail("BAD_REQUEST", "Nieprawidlowe dane wejsciowe", {
        categoryId: ["Nie znaleziono kategorii"],
      });
    }
    console.error("PATCH /api/transactions/[id]", error);
    return fail("INTERNAL", "Nie udalo sie zapisac transakcji");
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const auth = requireUserId(request);
  if (auth.error) return auth.error;

  const { id } = await params;
  const deleted = await dispatch(DeleteTransactionCommand({ userId: auth.userId, id }));
  return deleted ? noContent() : fail("NOT_FOUND", "Nie znaleziono transakcji");
}

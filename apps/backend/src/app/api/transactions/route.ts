import { createTransactionSchema, transactionListQuerySchema } from "@expence/types";
import { requireUserId } from "@/lib/auth-context";
import { created, fail, ok, parseJsonBody, parseQuery } from "@/lib/http";
import { dispatch } from "@/server/bus";
import {
  CreateTransactionCommand,
  ListTransactionsQuery,
} from "@/server/modules/transaction/transaction.messages";
import { TransactionCategoryNotFoundError } from "@/server/modules/transaction/transaction.errors";

export async function GET(request: Request) {
  const auth = requireUserId(request);
  if (auth.error) return auth.error;

  const query = parseQuery(request, transactionListQuerySchema);
  if (query.error) return query.error;

  return ok(await dispatch(ListTransactionsQuery({ userId: auth.userId, query: query.data })));
}

export async function POST(request: Request) {
  const auth = requireUserId(request);
  if (auth.error) return auth.error;

  const body = await parseJsonBody(request, createTransactionSchema);
  if (body.error) return body.error;

  try {
    return created(
      await dispatch(CreateTransactionCommand({ userId: auth.userId, input: body.data })),
    );
  } catch (error) {
    if (error instanceof TransactionCategoryNotFoundError) {
      return fail("BAD_REQUEST", "Nieprawidlowe dane wejsciowe", {
        categoryId: ["Nie znaleziono kategorii"],
      });
    }
    console.error("POST /api/transactions", error);
    return fail("INTERNAL", "Nie udalo sie zapisac transakcji");
  }
}

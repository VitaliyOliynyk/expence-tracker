import type { Bus } from "../../bus/bus";
import {
  CreateTransactionCommand,
  UpdateTransactionCommand,
  DeleteTransactionCommand,
  ListTransactionsQuery,
  GetTransactionQuery,
} from "./transaction.messages";
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
  listTransactions,
  getTransaction,
} from "./transaction.service";

/** Cienki adapter: wiaze wiadomosci szyny z serwisem modulu transakcji. */
export function registerTransactionHandlers(bus: Bus): void {
  bus.register(CreateTransactionCommand, (payload) =>
    createTransaction(payload.userId, payload.input),
  );
  bus.register(UpdateTransactionCommand, (payload) =>
    updateTransaction(payload.userId, payload.id, payload.input),
  );
  bus.register(DeleteTransactionCommand, (payload) => deleteTransaction(payload.userId, payload.id));
  bus.register(ListTransactionsQuery, (payload) => listTransactions(payload.userId, payload.query));
  bus.register(GetTransactionQuery, (payload) => getTransaction(payload.userId, payload.id));
}

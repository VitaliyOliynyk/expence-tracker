import type { Bus } from "../../bus/bus";
import {
  CreateTransactionCommand,
  UpdateTransactionCommand,
  DeleteTransactionCommand,
  ListTransactionsQuery,
  GetTransactionQuery,
  GetTransactionSummaryQuery,
} from "./transaction.messages";
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
  listTransactions,
  getTransaction,
  getSummary,
} from "./transaction.service";

/**
 * Cienki adapter: wiaze wiadomosci szyny z serwisem modulu transakcji.
 * Wolany raz, w `src/server/bus/index.ts`, przy tworzeniu szyny aplikacji.
 *
 * @param bus - szyna, na ktorej rejestrujemy handlery komend i zapytan modulu.
 * @returns Nic - efektem jest rejestracja szesciu handlerow na szynie.
 * @throws {Error} gdy ktoras z wiadomosci modulu ma juz handlera na tej szynie
 *   (np. funkcja wywolana drugi raz na tej samej instancji).
 */
export function registerTransactionHandlers(bus: Bus): void {
  bus.register(CreateTransactionCommand, (payload) =>
    createTransaction(payload.userId, payload.input),
  );
  bus.register(UpdateTransactionCommand, (payload) =>
    updateTransaction(payload.userId, payload.id, payload.input),
  );
  bus.register(DeleteTransactionCommand, (payload) =>
    deleteTransaction(payload.userId, payload.id),
  );
  bus.register(ListTransactionsQuery, (payload) => listTransactions(payload.userId, payload.query));
  bus.register(GetTransactionQuery, (payload) => getTransaction(payload.userId, payload.id));
  bus.register(GetTransactionSummaryQuery, (payload) => getSummary(payload.userId, payload.query));
}

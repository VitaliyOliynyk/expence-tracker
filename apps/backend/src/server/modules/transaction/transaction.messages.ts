import { defineCommand, defineQuery } from "../../bus/message";
import type {
  CreateTransactionInput,
  SummaryDto,
  SummaryQuery,
  TransactionDto,
  TransactionListQuery,
  UpdateTransactionInput,
} from "@expence/types";

/**
 * Jedyny plik modulu transaction importowany z zewnatrz. Reszta modulu
 * (repository, service, mapper, errors) jest jego szczegolem implementacyjnym.
 * Kazda wiadomosc niesie userId - to jedyna bariera miedzy kontami.
 */

export const CreateTransactionCommand = defineCommand<
  { userId: string; input: CreateTransactionInput },
  TransactionDto
>("transaction.create");

/** `null` gdy transakcji nie ma albo nalezy do innego uzytkownika. */
export const UpdateTransactionCommand = defineCommand<
  { userId: string; id: string; input: UpdateTransactionInput },
  TransactionDto | null
>("transaction.update");

/** `false` gdy transakcji nie ma albo nalezy do innego uzytkownika. */
export const DeleteTransactionCommand = defineCommand<{ userId: string; id: string }, boolean>(
  "transaction.delete",
);

export const ListTransactionsQuery = defineQuery<
  { userId: string; query: TransactionListQuery },
  TransactionDto[]
>("transaction.list");

export const GetTransactionQuery = defineQuery<{ userId: string; id: string }, TransactionDto | null>(
  "transaction.getById",
);

/** Suma transakcji jednego typu pogrupowana po kategorii albo miesiacu. */
export const GetTransactionSummaryQuery = defineQuery<
  { userId: string; query: SummaryQuery },
  SummaryDto
>("transaction.summary");

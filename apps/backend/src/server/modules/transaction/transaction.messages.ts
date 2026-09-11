import { defineCommand, defineQuery } from "../../bus/message";
import type {
  CreateTransactionInput,
  SummaryDto,
  SummaryQuery,
  TransactionDto,
  TransactionListQuery,
  TransactionListResponse,
  UpdateTransactionInput,
} from "@expence/types";

/**
 * Jedyny plik modulu transaction importowany z zewnatrz. Reszta modulu
 * (repository, service, mapper, errors) jest jego szczegolem implementacyjnym.
 * Kazda wiadomosc niesie userId - to jedyna bariera miedzy kontami.
 *
 * Wspolne dla wszystkich wiadomosci: `dispatch(...)` rzuca `Error`, gdy handler
 * modulu nie jest zarejestrowany, i przepuszcza bledy Prismy (np.
 * `Prisma.PrismaClientKnownRequestError`) przy problemie z baza danych.
 */

/**
 * Tworzy transakcje zalogowanego uzytkownika.
 *
 * @param payload.userId - wlasciciel transakcji, wylacznie z `requireUserId(request)`.
 * @param payload.input - body po `createTransactionSchema` (kwota juz w groszach).
 * @returns Utworzona transakcja jako `TransactionDto`.
 * @throws {TransactionCategoryNotFoundError} gdy `input.categoryId` nie istnieje
 *   albo nalezy do innego uzytkownika.
 */
export const CreateTransactionCommand = defineCommand<
  { userId: string; input: CreateTransactionInput },
  TransactionDto
>("transaction.create");

/**
 * Czesciowo aktualizuje transakcje - zmienia tylko pola obecne w `input`.
 *
 * @param payload.userId - wlasciciel transakcji, wylacznie z `requireUserId(request)`.
 * @param payload.id - id aktualizowanej transakcji.
 * @param payload.input - body po `updateTransactionSchema` (wszystkie pola opcjonalne).
 * @returns Transakcja po zmianie albo `null`, gdy transakcji nie ma albo nalezy
 *   do innego uzytkownika.
 * @throws {TransactionCategoryNotFoundError} gdy podany `input.categoryId` nie
 *   istnieje albo nalezy do innego uzytkownika.
 */
export const UpdateTransactionCommand = defineCommand<
  { userId: string; id: string; input: UpdateTransactionInput },
  TransactionDto | null
>("transaction.update");

/**
 * Usuwa transakcje uzytkownika.
 *
 * @param payload.userId - wlasciciel transakcji, wylacznie z `requireUserId(request)`.
 * @param payload.id - id usuwanej transakcji.
 * @returns `true` po usunieciu, `false` gdy transakcji nie ma albo nalezy do
 *   innego uzytkownika.
 */
export const DeleteTransactionCommand = defineCommand<{ userId: string; id: string }, boolean>(
  "transaction.delete",
);

/**
 * Jedna strona listy transakcji z filtrami i sumami dla calego wyniku filtrow.
 *
 * @param payload.userId - wlasciciel transakcji, wylacznie z `requireUserId(request)`.
 * @param payload.query - query po `transactionListQuerySchema` (filtry + `page`/`perPage`).
 * @returns `{ items, page, perPage, total, totals }`; `totals` liczone bez filtra `type`.
 */
export const ListTransactionsQuery = defineQuery<
  { userId: string; query: TransactionListQuery },
  TransactionListResponse
>("transaction.list");

/**
 * Pojedyncza transakcja uzytkownika.
 *
 * @param payload.userId - wlasciciel transakcji, wylacznie z `requireUserId(request)`.
 * @param payload.id - id szukanej transakcji.
 * @returns Transakcja albo `null`, gdy jej nie ma albo nalezy do innego uzytkownika.
 */
export const GetTransactionQuery = defineQuery<
  { userId: string; id: string },
  TransactionDto | null
>("transaction.getById");

/**
 * Suma transakcji jednego typu pogrupowana po kategorii albo miesiacu.
 *
 * @param payload.userId - wlasciciel transakcji, wylacznie z `requireUserId(request)`.
 * @param payload.query - query po `summaryQuerySchema` (`type`, `groupBy`, zakres dat).
 * @returns Podsumowanie w walucie domyslnej: suma calkowita i koszyki (`buckets`).
 */
export const GetTransactionSummaryQuery = defineQuery<
  { userId: string; query: SummaryQuery },
  SummaryDto
>("transaction.summary");

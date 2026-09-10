/** Bledy domenowe modulu transakcji - bez wiedzy o kodach HTTP, te tlumaczy route handler. */
export class TransactionCategoryNotFoundError extends Error {
  constructor(categoryId: string) {
    super(`Kategoria ${categoryId} nie istnieje albo nalezy do innego uzytkownika`);
    this.name = "TransactionCategoryNotFoundError";
  }
}

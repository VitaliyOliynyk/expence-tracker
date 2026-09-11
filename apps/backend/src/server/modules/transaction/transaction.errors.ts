/** Bledy domenowe modulu transakcji - bez wiedzy o kodach HTTP, te tlumaczy route handler. */

/**
 * Kategoria wskazana w transakcji nie istnieje albo nalezy do innego uzytkownika.
 * Oba przypadki sa celowo nierozroznialne - nie zdradzamy istnienia cudzych rekordow.
 * Route handler tlumaczy ten blad na `400 BAD_REQUEST` z bledem pola `categoryId`.
 */
export class TransactionCategoryNotFoundError extends Error {
  /**
   * @param categoryId - id kategorii, ktorej wlasnosci nie udalo sie potwierdzic.
   */
  constructor(categoryId: string) {
    super(`Kategoria ${categoryId} nie istnieje albo nalezy do innego uzytkownika`);
    this.name = "TransactionCategoryNotFoundError";
  }
}

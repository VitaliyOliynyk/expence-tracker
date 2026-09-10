/** Bledy domenowe modulu uzytkownika - bez wiedzy o kodach HTTP, te tlumaczy route handler. */
export class EmailTakenError extends Error {
  constructor(email: string) {
    super(`Konto z adresem ${email} juz istnieje`);
    this.name = "EmailTakenError";
  }
}

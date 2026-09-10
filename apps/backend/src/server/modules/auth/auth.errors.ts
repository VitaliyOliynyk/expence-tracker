/** Bledy domenowe modulu autoryzacji - bez wiedzy o kodach HTTP, te tlumaczy route handler. */
export class InvalidCredentialsError extends Error {
  constructor() {
    super("Nieprawidlowy e-mail lub haslo");
    this.name = "InvalidCredentialsError";
  }
}

export class InactiveAccountError extends Error {
  constructor() {
    super("Konto jest nieaktywne");
    this.name = "InactiveAccountError";
  }
}

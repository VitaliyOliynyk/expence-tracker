import { loginSchema } from "@expence/types";
import { fail, ok, parseJsonBody } from "@/lib/http";
import { dispatch } from "@/server/bus";
import { LoginCommand } from "@/server/modules/auth/auth.messages";
import { InactiveAccountError, InvalidCredentialsError } from "@/server/modules/auth/auth.errors";

// Opis OpenAPI: src/openapi/auth.paths.ts - zmiana statusow wymaga zmiany tam.

/**
 * POST /api/auth/login - sprawdza e-mail i haslo, aktualizuje `lastLoginAt` i zwraca
 * token dostepu. Publiczny (PUBLIC_PATHS w proxy.ts).
 *
 * Nie rzuca wyjatkow - kazdy blad logowania tlumaczy na odpowiedz.
 *
 * @param request - zadanie z body `loginSchema` (`email`, `password`).
 * @returns 200 z `AuthResponse`, 400 przy blednym body, 401 przy zlym e-mailu albo hasle
 *   (ten sam komunikat w obu przypadkach), 403 gdy konto jest nieaktywne,
 *   500 `INTERNAL` przy innym bledzie logowania.
 */
export async function POST(request: Request) {
  const body = await parseJsonBody(request, loginSchema);
  if (body.error) return body.error;

  try {
    return ok(await dispatch(LoginCommand(body.data)));
  } catch (error) {
    // Ten sam komunikat dla zlego hasla i nieistniejacego konta - inaczej
    // odpowiedz zdradzalaby, ktore adresy sa zarejestrowane.
    if (error instanceof InvalidCredentialsError) {
      return fail("UNAUTHORIZED", "Nieprawidlowy e-mail lub haslo");
    }
    if (error instanceof InactiveAccountError) {
      return fail("FORBIDDEN", "Konto jest nieaktywne");
    }
    console.error("POST /api/auth/login", error);
    return fail("INTERNAL", "Nie udalo sie zalogowac");
  }
}

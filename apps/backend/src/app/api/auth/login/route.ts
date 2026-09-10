import { loginSchema } from "@expence/types";
import { fail, ok, parseJsonBody } from "@/lib/http";
import { dispatch } from "@/server/bus";
import { LoginCommand } from "@/server/modules/auth/auth.messages";
import { InactiveAccountError, InvalidCredentialsError } from "@/server/modules/auth/auth.errors";

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

import { registerSchema } from "@expence/types";
import { created, fail, parseJsonBody } from "@/lib/http";
import { dispatch } from "@/server/bus";
import { RegisterCommand } from "@/server/modules/auth/auth.messages";
import { EmailTakenError } from "@/server/modules/user/user.errors";

// Opis OpenAPI: src/openapi/auth.paths.ts - zmiana statusow wymaga zmiany tam.

/**
 * POST /api/auth/register - zaklada konto i od razu zwraca token dostepu.
 * Publiczny (PUBLIC_PATHS w proxy.ts).
 *
 * Nie rzuca wyjatkow - kazdy blad rejestracji tlumaczy na odpowiedz.
 *
 * @param request - zadanie z body `registerSchema` (`name`, `email`, `password`).
 * @returns 201 z `AuthResponse`, 400 przy blednym body, 409 gdy e-mail jest juz zajety,
 *   500 `INTERNAL` przy innym bledzie rejestracji.
 */
export async function POST(request: Request) {
  const body = await parseJsonBody(request, registerSchema);
  if (body.error) return body.error;

  try {
    return created(await dispatch(RegisterCommand(body.data)));
  } catch (error) {
    if (error instanceof EmailTakenError) {
      return fail("CONFLICT", "Konto z tym adresem juz istnieje");
    }
    console.error("POST /api/auth/register", error);
    return fail("INTERNAL", "Nie udalo sie zarejestrowac");
  }
}

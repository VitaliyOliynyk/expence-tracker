import { requireUserId } from "@/lib/auth-context";
import { fail, ok } from "@/lib/http";
import { dispatch } from "@/server/bus";
import { GetUserByIdQuery } from "@/server/modules/user/user.messages";

// Opis OpenAPI: src/openapi/auth.paths.ts - zmiana statusow wymaga zmiany tam.

/**
 * GET /api/auth/me - profil zalogowanego uzytkownika.
 *
 * @param request - zadanie z naglowkiem `x-user-id`.
 * @returns 200 z `UserDto`, 404 gdy token jest wazny, ale konta juz nie ma, 401 bez `x-user-id`
 *   (w praktyce odcina to wczesniej proxy.ts).
 * @throws Blad Prismy przy problemie z baza danych - handler go nie lapie, Next zwraca wtedy 500.
 */
export async function GET(request: Request) {
  const auth = requireUserId(request);
  if (auth.error) return auth.error;

  const user = await dispatch(GetUserByIdQuery({ userId: auth.userId }));
  return user ? ok(user) : fail("NOT_FOUND", "Nie znaleziono uzytkownika");
}

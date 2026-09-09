import { fail } from "@/lib/http";

/** Naglowek ustawiany wylacznie przez proxy.ts po weryfikacji tokenu. */
export const USER_ID_HEADER = "x-user-id";

/**
 * Jedyne zrodlo prawdy o tozsamosci wolajacego.
 * Handlery NIGDY nie czytaja userId z body ani z query - to otwiera IDOR.
 */
export function getUserId(request: Request): string | null {
  return request.headers.get(USER_ID_HEADER);
}

export function requireUserId(
  request: Request,
): { userId: string; error?: undefined } | { userId?: undefined; error: Response } {
  const userId = getUserId(request);
  if (!userId) {
    // W praktyce proxy odcina to wczesniej; to zabezpieczenie na wypadek
    // zmiany matchera albo wywolania handlera z pominieciem proxy.
    return { error: fail("UNAUTHORIZED", "Wymagany token dostepu") };
  }
  return { userId };
}

/**
 * Backend nie ma wlasnej sesji. Weryfikacja tokenu jest bezstanowa - bez
 * zapytania do bazy. Sama logika kryptograficzna (podpis/weryfikacja, stale
 * issuera/audience) siedzi w @expence/auth, bo token bije nie tylko frontend
 * (mennica /api/token), ale i backend (register/login modulu auth).
 */
export { ACCESS_TOKEN_ISSUER, ACCESS_TOKEN_AUDIENCE, verifyAccessToken } from "@expence/auth";

export function readBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

import { jwtVerify } from "jose";

/**
 * Backend nie ma wlasnej sesji. Frontend podpisuje krotkozyciowy token dostepu
 * tym samym AUTH_SECRET (patrz apps/frontend/src/lib/access-token.ts),
 * a my weryfikujemy go bezstanowo - bez zapytania do bazy.
 */
export const ACCESS_TOKEN_ISSUER = "expence-frontend";
export const ACCESS_TOKEN_AUDIENCE = "expence-backend";

let cachedKey: Uint8Array | undefined;

function getSecretKey(): Uint8Array {
  if (!cachedKey) {
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
      throw new Error("Brak AUTH_SECRET - backend nie moze zweryfikowac tokenow.");
    }
    cachedKey = new TextEncoder().encode(secret);
  }
  return cachedKey;
}

export function readBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

/** Zwraca userId (claim `sub`) albo null, gdy token jest nieobecny/niewazny. */
export async function verifyAccessToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      issuer: ACCESS_TOKEN_ISSUER,
      audience: ACCESS_TOKEN_AUDIENCE,
    });
    return typeof payload.sub === "string" && payload.sub.length > 0 ? payload.sub : null;
  } catch {
    return null;
  }
}

import { SignJWT, jwtVerify } from "jose";

/**
 * Token dostepu do backendu: bezstanowy JWT HS256 podpisywany wspolnym AUTH_SECRET.
 * Wystawiany przez modul autoryzacji (register/login) i przez /api/token na
 * frontendzie (odswiezenie na podstawie istniejacej sesji Auth.js).
 * Backend weryfikuje go bez zapytania do bazy - patrz apps/backend/proxy.ts.
 */
export const ACCESS_TOKEN_ISSUER = "expence-auth";
export const ACCESS_TOKEN_AUDIENCE = "expence-backend";
export const ACCESS_TOKEN_TTL_SECONDS = 10 * 60;

let cachedKey: Uint8Array | undefined;

function getSecretKey(): Uint8Array {
  if (!cachedKey) {
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
      throw new Error("Brak AUTH_SECRET w .env");
    }
    cachedKey = new TextEncoder().encode(secret);
  }
  return cachedKey;
}

export async function signAccessToken(userId: string): Promise<{
  token: string;
  expiresAt: number;
}> {
  const expiresAt = Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000;

  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(ACCESS_TOKEN_ISSUER)
    .setAudience(ACCESS_TOKEN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt / 1000))
    .sign(getSecretKey());

  return { token, expiresAt };
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

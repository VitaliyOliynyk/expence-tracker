import "server-only";
import { SignJWT } from "jose";

/**
 * Frontend jest jedynym wlascicielem sesji. Do apps/backend nie leci cookie
 * sesyjne Auth.js (to zaszyfrowany JWE, zwiazany z wewnetrznym formatem
 * next-auth), tylko wlasny, krotkozyciowy token HS256 podpisany AUTH_SECRET.
 * Backend weryfikuje go bezstanowo - patrz apps/backend/src/lib/jwt.ts.
 */
export const ACCESS_TOKEN_ISSUER = "expence-frontend";
export const ACCESS_TOKEN_AUDIENCE = "expence-backend";
export const ACCESS_TOKEN_TTL_SECONDS = 10 * 60;

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("Brak AUTH_SECRET w .env");
  }
  return new TextEncoder().encode(secret);
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

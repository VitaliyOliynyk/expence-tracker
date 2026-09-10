import "server-only";
import { authResponseSchema, loginSchema, registerSchema } from "@expence/types";
import type { AuthResponse, LoginInput, RegisterInput } from "@expence/types";

// Wolane wylacznie z serwera (Server Actions, authorize()) - bez Bearera,
// bo tu jeszcze nie ma tokenu do wyslania. API_URL to adres widziany z
// serwera frontendu, w dev rowny NEXT_PUBLIC_API_URL.
const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/** Rzucany przy 400/409 - bledach, ktore Server Action powinna pokazac uzytkownikowi. */
export class AuthApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AuthApiError";
  }
}

async function callAuthEndpoint(path: string, body: unknown): Promise<AuthResponse | null> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (response.status === 401) return null;

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: { message?: string } }).error?.message ?? "Blad autoryzacji")
        : "Blad autoryzacji";
    throw new AuthApiError(response.status, message);
  }

  return authResponseSchema.parse(data);
}

/** Zwraca null przy zlym e-mailu/hasle - authorize() z NextAuth oczekuje wlasnie null, nie wyjatku. */
export async function loginRequest(input: LoginInput): Promise<AuthResponse | null> {
  return callAuthEndpoint("/api/auth/login", loginSchema.parse(input));
}

/** Rzuca AuthApiError (409 - zajety e-mail, 400 - walidacja) - Server Action ja przechwytuje. */
export async function registerRequest(input: RegisterInput): Promise<AuthResponse> {
  const result = await callAuthEndpoint("/api/auth/register", registerSchema.parse(input));
  if (!result) throw new AuthApiError(500, "Rejestracja nie powiodla sie");
  return result;
}

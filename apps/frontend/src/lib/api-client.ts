import type { ApiError } from "@expence/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/** Blad z backendu w formie, ktora TanStack Query poda do UI. */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiError["error"]["code"],
    message: string,
    readonly fields?: ApiError["error"]["fields"],
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

// Token zyje 10 minut; trzymamy go w pamieci karty i odswiezamy z zapasem.
const REFRESH_MARGIN_MS = 30_000;
let cachedToken: { token: string; expiresAt: number } | null = null;
let pendingToken: Promise<string> | null = null;

async function fetchAccessToken(): Promise<string> {
  const response = await fetch("/api/token", { credentials: "include" });
  if (!response.ok) {
    cachedToken = null;
    throw new ApiRequestError(response.status, "UNAUTHORIZED", "Sesja wygasla - zaloguj sie ponownie");
  }
  const data = (await response.json()) as { token: string; expiresAt: number };
  cachedToken = data;
  return data.token;
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt - REFRESH_MARGIN_MS > Date.now()) {
    return cachedToken.token;
  }
  // Kilka rownoleglych zapytan ma dzielic jedno odswiezenie tokenu.
  pendingToken ??= fetchAccessToken().finally(() => {
    pendingToken = null;
  });
  return pendingToken;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  if (!response.ok) {
    if (response.status === 401) cachedToken = null;
    const body = (await response.json().catch(() => null)) as ApiError | null;
    throw new ApiRequestError(
      response.status,
      body?.error.code ?? "INTERNAL",
      body?.error.message ?? "Blad polaczenia z API",
      body?.error.fields,
    );
  }

  return (await response.json()) as T;
}

export function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { USER_ID_HEADER } from "@/lib/auth-context";
import { readBearerToken, verifyAccessToken } from "@/lib/jwt";

// W Next 16 `middleware.ts` zostal przemianowany na `proxy.ts`.
// Tu odbywa sie CORS i weryfikacja tokenu - handlery dostaja juz x-user-id.

const PUBLIC_PATHS = ["/api/health"];

const CORS_HEADERS = {
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

function allowedOrigin(request: NextRequest): string | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  const allowList = (process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000")
    .split(",")
    .map((value) => value.trim());
  return allowList.includes(origin) ? origin : null;
}

function withCors(response: NextResponse, origin: string | null): NextResponse {
  if (origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
  }
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export async function proxy(request: NextRequest) {
  const origin = allowedOrigin(request);

  if (request.method === "OPTIONS") {
    return withCors(new NextResponse(null, { status: 204 }), origin);
  }

  if (PUBLIC_PATHS.includes(request.nextUrl.pathname)) {
    return withCors(NextResponse.next(), origin);
  }

  const token = readBearerToken(request);
  const userId = token ? await verifyAccessToken(token) : null;

  if (!userId) {
    return withCors(
      NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Wymagany token dostepu" } },
        { status: 401 },
      ),
      origin,
    );
  }

  // Naglowek nadpisujemy zawsze - klient nie moze go podstawic z zewnatrz.
  const headers = new Headers(request.headers);
  headers.set(USER_ID_HEADER, userId);

  return withCors(NextResponse.next({ request: { headers } }), origin);
}

export const config = {
  matcher: "/api/:path*",
};

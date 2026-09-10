import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// W Next 16 `middleware.ts` nazywa sie `proxy.ts`.
// Trzymamy tu tylko tanie sprawdzenie obecnosci cookie sesji - wlasciwa
// autoryzacja jest w layoucie (dashboard)/layout.tsx i w backendzie.
const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

export function proxy(request: NextRequest) {
  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));
  if (hasSession) return NextResponse.next();

  const signInUrl = new URL("/sign-in", request.url);
  signInUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
  return NextResponse.redirect(signInUrl);
}

export const config = {
  // Tylko widoki panelu; /sign-in, /api/* i statyki zostaja poza matcherem.
  matcher: ["/categories/:path*"],
};

import { signAccessToken } from "@expence/auth";
import { auth } from "@/auth";

/**
 * Mennica tokenow dla przegladarki: zamienia cookie sesyjne Auth.js na
 * krotkozyciowy Bearer, ktorym klient wola apps/backend bezposrednio.
 */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return Response.json(
      { error: { code: "UNAUTHORIZED", message: "Brak aktywnej sesji" } },
      { status: 401 },
    );
  }

  const { token, expiresAt } = await signAccessToken(userId);
  return Response.json({ token, expiresAt }, { headers: { "Cache-Control": "no-store" } });
}

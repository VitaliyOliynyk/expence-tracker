import { requireUserId } from "@/lib/auth-context";
import { fail, ok } from "@/lib/http";
import { dispatch } from "@/server/bus";
import { GetUserByIdQuery } from "@/server/modules/user/user.messages";

export async function GET(request: Request) {
  const auth = requireUserId(request);
  if (auth.error) return auth.error;

  const user = await dispatch(GetUserByIdQuery({ userId: auth.userId }));
  return user ? ok(user) : fail("NOT_FOUND", "Nie znaleziono uzytkownika");
}

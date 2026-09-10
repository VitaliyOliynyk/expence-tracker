import { registerSchema } from "@expence/types";
import { created, fail, parseJsonBody } from "@/lib/http";
import { dispatch } from "@/server/bus";
import { RegisterCommand } from "@/server/modules/auth/auth.messages";
import { EmailTakenError } from "@/server/modules/user/user.errors";

export async function POST(request: Request) {
  const body = await parseJsonBody(request, registerSchema);
  if (body.error) return body.error;

  try {
    return created(await dispatch(RegisterCommand(body.data)));
  } catch (error) {
    if (error instanceof EmailTakenError) {
      return fail("CONFLICT", "Konto z tym adresem juz istnieje");
    }
    console.error("POST /api/auth/register", error);
    return fail("INTERNAL", "Nie udalo sie zarejestrowac");
  }
}

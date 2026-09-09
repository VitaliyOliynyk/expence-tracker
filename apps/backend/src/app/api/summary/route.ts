import { summaryQuerySchema } from "@expence/types";
import { requireUserId } from "@/lib/auth-context";
import { ok, parseQuery } from "@/lib/http";
import { getSummary } from "@/server/services/summary.service";

export async function GET(request: Request) {
  const auth = requireUserId(request);
  if (auth.error) return auth.error;

  const query = parseQuery(request, summaryQuerySchema);
  if (query.error) return query.error;

  return ok(await getSummary(auth.userId, query.data));
}

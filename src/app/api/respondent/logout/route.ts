import { handleApi } from "@/lib/api";
import { clearSessionCookie } from "@/lib/session";

export const runtime = "nodejs";

export async function POST() {
  return handleApi(async () => {
    await clearSessionCookie();
    return { ok: true };
  });
}

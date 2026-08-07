import { NextRequest } from "next/server";
import { handleApi } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { staffLoginSchema } from "@/lib/validation";
import { resolveStaffRole } from "@/lib/access-code";
import { setSessionCookie } from "@/lib/session";
import { clientIpFromHeaders, rateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const ip = clientIpFromHeaders(request.headers);
    if (!rateLimit(`staff-login:${ip}`, 10, 60_000)) {
      throw new AppError(
        429,
        "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.",
      );
    }

    const body = staffLoginSchema.parse(await request.json());
    const role = resolveStaffRole(body.accessCode);
    if (!role) {
      throw new AppError(401, "Access Code가 올바르지 않습니다.");
    }

    await setSessionCookie({ kind: "staff", role });
    await logAudit({ actorRole: role, action: "staff.login" });
    return { role };
  });
}

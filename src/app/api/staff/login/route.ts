import { NextRequest } from "next/server";
import { handleApi } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { staffLoginSchema } from "@/lib/validation";
import { isRoleCodeConfigured, resolveStaffRole } from "@/lib/access-code";
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

    // 환경변수 미설정과 코드 불일치를 구분해 안내한다.
    if (!isRoleCodeConfigured(body.role)) {
      const envName =
        body.role === "admin" ? "ADMIN_ACCESS_CODE" : "REVIEWER_ACCESS_CODE";
      throw new AppError(
        503,
        `서버에 ${body.role === "admin" ? "관리자" : "확인자"} Access Code(${envName} 환경변수)가 설정되지 않았습니다. 배포 환경(Vercel)의 Environment Variables 또는 로컬 .env 파일을 확인해 주세요.`,
      );
    }

    const role = resolveStaffRole(body.accessCode);
    // 선택한 역할(관리자/확인자)과 코드가 일치해야 로그인된다.
    if (!role || role !== body.role) {
      throw new AppError(401, "Access Code가 올바르지 않습니다.");
    }

    await setSessionCookie({ kind: "staff", role });
    await logAudit({ actorRole: role, action: "staff.login" });
    return { role };
  });
}

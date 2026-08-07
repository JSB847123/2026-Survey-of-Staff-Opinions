import { NextRequest } from "next/server";
import { hash } from "@node-rs/argon2";
import { handleApi } from "@/lib/api";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { respondentSignupSchema } from "@/lib/validation";
import { createRespondentAccount } from "@/lib/accounts";
import { setSessionCookie } from "@/lib/session";
import { clientIpFromHeaders, rateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const ip = clientIpFromHeaders(request.headers);
    if (!rateLimit(`respondent-signup:${ip}`, 5, 60_000)) {
      throw new AppError(
        429,
        "가입 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.",
      );
    }

    const body = respondentSignupSchema.parse(await request.json());
    const passwordHash = await hash(body.password);
    const account = await createRespondentAccount(
      prisma,
      body.loginId,
      passwordHash,
    );

    // 가입 즉시 로그인 처리
    await setSessionCookie({
      kind: "respondent",
      accountId: account.id,
      loginId: account.loginId,
    });

    await logAudit({
      actorRole: "respondent",
      action: "respondent.signup",
      targetType: "respondentAccount",
      targetId: account.id,
      metadata: { loginId: account.loginId },
    });

    return { ok: true };
  });
}

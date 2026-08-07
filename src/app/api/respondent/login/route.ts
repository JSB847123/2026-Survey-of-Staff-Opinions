import { NextRequest } from "next/server";
import { verify } from "@node-rs/argon2";
import { handleApi } from "@/lib/api";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { respondentLoginSchema } from "@/lib/validation";
import { setSessionCookie } from "@/lib/session";
import { clientIpFromHeaders, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 10;

const INVALID_MESSAGE = "ID 또는 비밀번호가 올바르지 않습니다.";

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const ip = clientIpFromHeaders(request.headers);
    if (!rateLimit(`respondent-login:${ip}`, 10, 60_000)) {
      throw new AppError(
        429,
        "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.",
      );
    }

    const body = respondentLoginSchema.parse(await request.json());

    const survey = await prisma.survey.findUnique({
      where: { slug: body.slug },
    });
    if (!survey || survey.status !== "PUBLISHED") {
      throw new AppError(404, "진행 중인 설문을 찾을 수 없습니다.");
    }

    const account = await prisma.respondentAccount.findUnique({
      where: {
        surveyId_loginId: { surveyId: survey.id, loginId: body.loginId },
      },
    });
    if (!account || !account.active) {
      throw new AppError(401, INVALID_MESSAGE);
    }

    // brute-force 방어: 연속 실패 시 계정 잠금
    if (account.lockedUntil && account.lockedUntil > new Date()) {
      throw new AppError(
        423,
        "로그인 실패가 반복되어 계정이 일시적으로 잠겼습니다. 잠시 후 다시 시도해 주세요.",
      );
    }

    const valid = await verify(account.passwordHash, body.password);
    if (!valid) {
      const failed = account.failedLogins + 1;
      await prisma.respondentAccount.update({
        where: { id: account.id },
        data: {
          failedLogins: failed,
          lockedUntil:
            failed >= MAX_FAILED_LOGINS
              ? new Date(Date.now() + LOCK_MINUTES * 60_000)
              : null,
        },
      });
      throw new AppError(401, INVALID_MESSAGE);
    }

    if (account.failedLogins > 0 || account.lockedUntil) {
      await prisma.respondentAccount.update({
        where: { id: account.id },
        data: { failedLogins: 0, lockedUntil: null },
      });
    }

    await setSessionCookie({
      kind: "respondent",
      accountId: account.id,
      surveyId: survey.id,
      loginId: account.loginId,
    });

    const existing = await prisma.surveyResponse.findUnique({
      where: { respondentAccountId: account.id },
    });

    return { ok: true, alreadySubmitted: Boolean(existing) };
  });
}

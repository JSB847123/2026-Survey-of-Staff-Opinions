import { NextRequest } from "next/server";
import { hash } from "@node-rs/argon2";
import { handleApi } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { respondentUpdateSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

type Params = { params: Promise<{ accountId: string }> };

async function findAccount(accountId: string) {
  const account = await prisma.respondentAccount.findUnique({
    where: { id: accountId },
  });
  if (!account) throw new AppError(404, "응답자 계정을 찾을 수 없습니다.");
  return account;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const session = await requireAdmin();
    const { accountId } = await params;
    const body = respondentUpdateSchema.parse(await request.json());
    await findAccount(accountId);

    const data: { active?: boolean; passwordHash?: string } = {};
    if (body.active !== undefined) data.active = body.active;
    if (body.password) data.passwordHash = await hash(body.password);
    if (Object.keys(data).length === 0) {
      throw new AppError(400, "변경할 내용이 없습니다.");
    }

    const account = await prisma.respondentAccount.update({
      where: { id: accountId },
      data,
      select: { id: true, loginId: true, active: true },
    });

    await logAudit({
      actorRole: session.role,
      action: body.password ? "respondent.password_change" : "respondent.update",
      targetType: "respondentAccount",
      targetId: accountId,
      metadata: { active: body.active },
    });
    return { account };
  });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const session = await requireAdmin();
    const { accountId } = await params;
    const account = await findAccount(accountId);

    // 이 계정이 제출한 응답이 있는 설문들의 responseCount를 함께 보정한다.
    await prisma.$transaction(async (tx) => {
      const responses = await tx.surveyResponse.findMany({
        where: { respondentAccountId: accountId },
        select: { surveyId: true },
      });
      await tx.respondentAccount.delete({ where: { id: accountId } });
      for (const response of responses) {
        await tx.survey.update({
          where: { id: response.surveyId },
          data: { responseCount: { decrement: 1 } },
        });
      }
    });

    await logAudit({
      actorRole: session.role,
      action: "respondent.delete",
      targetType: "respondentAccount",
      targetId: accountId,
      metadata: { loginId: account.loginId },
    });
    return { ok: true };
  });
}

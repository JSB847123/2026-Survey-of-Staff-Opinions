import { NextRequest } from "next/server";
import { hash } from "@node-rs/argon2";
import { handleApi } from "@/lib/api";
import { requireAdmin, requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { respondentCreateSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  return handleApi(async () => {
    await requireStaff();
    const { id } = await params;
    const accounts = await prisma.respondentAccount.findMany({
      where: { surveyId: id },
      orderBy: { loginId: "asc" },
      select: {
        id: true,
        loginId: true,
        active: true,
        createdAt: true,
        response: { select: { id: true, submittedAt: true } },
      },
    });
    return { accounts };
  });
}

export async function POST(request: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const session = await requireAdmin();
    const { id } = await params;
    const body = respondentCreateSchema.parse(await request.json());

    const survey = await prisma.survey.findUnique({ where: { id } });
    if (!survey) throw new AppError(404, "설문을 찾을 수 없습니다.");

    const passwordHash = await hash(body.password);

    try {
      const account = await prisma.$transaction(async (tx) => {
        const count = await tx.respondentAccount.count({
          where: { surveyId: id },
        });
        if (count >= survey.maxRespondents) {
          throw new AppError(
            409,
            `응답자 계정은 설문당 최대 ${survey.maxRespondents}개까지 만들 수 있습니다.`,
          );
        }
        return tx.respondentAccount.create({
          data: { surveyId: id, loginId: body.loginId, passwordHash },
          select: { id: true, loginId: true, active: true, createdAt: true },
        });
      });

      await logAudit({
        actorRole: session.role,
        action: "respondent.create",
        targetType: "respondentAccount",
        targetId: account.id,
        metadata: { surveyId: id, loginId: body.loginId },
      });
      return { account };
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code?: string }).code === "P2002"
      ) {
        throw new AppError(409, "이미 사용 중인 ID입니다.");
      }
      throw error;
    }
  });
}

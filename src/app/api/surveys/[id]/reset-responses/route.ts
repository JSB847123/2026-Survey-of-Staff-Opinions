import { NextRequest } from "next/server";
import { handleApi } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/** 응답 초기화 (관리자 전용): 모든 응답을 삭제하고 responseCount를 0으로 되돌린다. */
export async function POST(_request: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const session = await requireAdmin();
    const { id } = await params;

    const survey = await prisma.survey.findUnique({ where: { id } });
    if (!survey) throw new AppError(404, "설문을 찾을 수 없습니다.");

    const deleted = await prisma.$transaction(async (tx) => {
      const result = await tx.surveyResponse.deleteMany({
        where: { surveyId: id },
      });
      await tx.survey.update({
        where: { id },
        data: { responseCount: 0 },
      });
      return result.count;
    });

    await logAudit({
      actorRole: session.role,
      action: "survey.reset_responses",
      targetType: "survey",
      targetId: id,
      metadata: { deletedResponses: deleted },
    });
    return { deleted };
  });
}

import { NextRequest } from "next/server";
import { handleApi } from "@/lib/api";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { publishActionSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const session = await requireStaff();
    const { id } = await params;
    const { action } = publishActionSchema.parse(await request.json());

    const survey = await prisma.survey.findUnique({
      where: { id },
      include: { _count: { select: { questions: true } } },
    });
    if (!survey) throw new AppError(404, "설문을 찾을 수 없습니다.");

    if (action === "publish") {
      if (survey._count.questions === 0) {
        throw new AppError(400, "문항이 없는 설문은 게시할 수 없습니다.");
      }
      const needsReview = await prisma.question.count({
        where: { surveyId: id, needsReview: true },
      });
      if (needsReview > 0) {
        throw new AppError(
          400,
          `'확인 필요' 상태의 문항이 ${needsReview}개 있습니다. 편집 화면에서 확인 처리 후 게시해 주세요.`,
        );
      }
      const updated = await prisma.survey.update({
        where: { id },
        data: { status: "PUBLISHED", publishedAt: survey.publishedAt ?? new Date() },
      });
      await logAudit({
        actorRole: session.role,
        action: "survey.publish",
        targetType: "survey",
        targetId: id,
      });
      return { survey: updated };
    }

    if (action === "unpublish") {
      const updated = await prisma.survey.update({
        where: { id },
        data: { status: "DRAFT" },
      });
      await logAudit({
        actorRole: session.role,
        action: "survey.unpublish",
        targetType: "survey",
        targetId: id,
      });
      return { survey: updated };
    }

    const updated = await prisma.survey.update({
      where: { id },
      data: { status: "CLOSED" },
    });
    await logAudit({
      actorRole: session.role,
      action: "survey.close",
      targetType: "survey",
      targetId: id,
    });
    return { survey: updated };
  });
}

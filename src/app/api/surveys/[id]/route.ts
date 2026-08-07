import { NextRequest } from "next/server";
import { handleApi } from "@/lib/api";
import { requireAdmin, requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { surveyMetaSchema } from "@/lib/validation";
import { getStorage } from "@/lib/storage";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  return handleApi(async () => {
    await requireStaff();
    const { id } = await params;
    const survey = await prisma.survey.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: "asc" },
          include: { options: { orderBy: { order: "asc" } } },
        },
      },
    });
    if (!survey) throw new AppError(404, "설문을 찾을 수 없습니다.");
    return { survey };
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const session = await requireStaff();
    const { id } = await params;
    const body = surveyMetaSchema.parse(await request.json());

    const survey = await prisma.survey.update({
      where: { id },
      data: { title: body.title, description: body.description ?? null },
    });

    await logAudit({
      actorRole: session.role,
      action: "survey.update_meta",
      targetType: "survey",
      targetId: id,
    });
    return { survey };
  });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const session = await requireAdmin();
    const { id } = await params;

    const survey = await prisma.survey.findUnique({ where: { id } });
    if (!survey) throw new AppError(404, "설문을 찾을 수 없습니다.");

    await prisma.survey.delete({ where: { id } });
    if (survey.sourceFilePath) {
      await getStorage().remove(survey.sourceFilePath);
    }

    await logAudit({
      actorRole: session.role,
      action: "survey.delete",
      targetType: "survey",
      targetId: id,
      metadata: { title: survey.title },
    });
    return { ok: true };
  });
}

import { NextRequest } from "next/server";
import { handleApi } from "@/lib/api";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { computeSurveyStats } from "@/lib/stats";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  return handleApi(async () => {
    await requireStaff();
    const { id } = await params;
    const survey = await prisma.survey.findUnique({ where: { id } });
    if (!survey) throw new AppError(404, "설문을 찾을 수 없습니다.");
    const stats = await computeSurveyStats(id);
    return { stats };
  });
}

import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { handleApi } from "@/lib/api";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { analysisRunSchema } from "@/lib/validation";
import { computeSurveyStats } from "@/lib/stats";
import {
  analysisResultToMarkdown,
  getAnalysisProvider,
  type SurveyAnalysisInput,
} from "@/lib/analysis";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const maxDuration = 120;

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  return handleApi(async () => {
    await requireStaff();
    const { id } = await params;
    const analyses = await prisma.analysis.findMany({
      where: { surveyId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return { analyses };
  });
}

export async function POST(request: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const session = await requireStaff();
    const { id } = await params;
    const body = analysisRunSchema.parse(await request.json());

    const survey = await prisma.survey.findUnique({ where: { id } });
    if (!survey) throw new AppError(404, "설문을 찾을 수 없습니다.");
    if (survey.responseCount === 0) {
      throw new AppError(400, "아직 제출된 응답이 없어 분석할 수 없습니다.");
    }

    const provider = getAnalysisProvider(body.provider);

    // 같은 survey + version + responseCount + model의 최근 결과가 있으면 재사용
    if (!body.force) {
      const cached = await prisma.analysis.findFirst({
        where: {
          surveyId: id,
          provider: provider.id,
          model: provider.model,
          surveyVersion: survey.version,
          responseCount: survey.responseCount,
        },
        orderBy: { createdAt: "desc" },
      });
      if (cached) {
        return { analysis: cached, cached: true };
      }
    }

    const stats = await computeSurveyStats(id);

    // AI에는 익명화된 데이터만 전달한다 (응답자 ID/비밀번호/세션 등 제외).
    const input: SurveyAnalysisInput = {
      surveyTitle: survey.title,
      surveyDescription: survey.description ?? undefined,
      respondentCount: stats.submittedCount,
      maxRespondents: survey.maxRespondents,
      choiceStats: stats.questions
        .filter((q) => q.type === "CHECKBOX")
        .map((q) => ({
          questionTitle: q.title,
          options: q.options.map((o) => ({
            label: o.label,
            count: o.count,
            percentage: o.percentage,
          })),
        })),
      textAnswers: stats.questions
        .filter((q) => q.type !== "CHECKBOX")
        .map((q) => ({
          questionTitle: q.title,
          answers: q.textAnswers,
        })),
    };

    const result = await provider.analyze(input);

    const analysis = await prisma.analysis.create({
      data: {
        surveyId: id,
        provider: provider.id,
        model: provider.model,
        resultJson: result as unknown as Prisma.InputJsonValue,
        resultMarkdown: analysisResultToMarkdown(result),
        responseCount: survey.responseCount,
        surveyVersion: survey.version,
        createdByRole: session.role,
      },
    });

    await logAudit({
      actorRole: session.role,
      action: "analysis.run",
      targetType: "survey",
      targetId: id,
      metadata: { provider: provider.id, model: provider.model },
    });

    return { analysis, cached: false };
  });
}

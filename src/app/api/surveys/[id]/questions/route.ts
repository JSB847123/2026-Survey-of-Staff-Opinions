import { NextRequest } from "next/server";
import { handleApi } from "@/lib/api";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { questionsSaveSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/**
 * 설문 문항 전체 저장(추가/수정/삭제/순서 변경).
 * 응답이 이미 존재하면 기존 응답 의미를 훼손하는 변경(문항 삭제,
 * 타입 변경, 선택지 삭제)을 서버에서 차단한다.
 */
export async function PUT(request: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const session = await requireStaff();
    const { id } = await params;
    const body = questionsSaveSchema.parse(await request.json());

    const survey = await prisma.survey.findUnique({
      where: { id },
      include: {
        questions: { include: { options: true } },
      },
    });
    if (!survey) throw new AppError(404, "설문을 찾을 수 없습니다.");

    const hasResponses = survey.responseCount > 0;
    const existingQuestions = new Map(survey.questions.map((q) => [q.id, q]));
    const incomingIds = new Set(
      body.questions.map((q) => q.id).filter((v): v is string => Boolean(v)),
    );

    // 응답이 있는 경우의 구조 변경 검증
    if (hasResponses) {
      for (const existing of survey.questions) {
        if (!incomingIds.has(existing.id)) {
          throw new AppError(
            409,
            "이미 응답이 존재하는 설문에서는 문항을 삭제할 수 없습니다.",
          );
        }
      }
      for (const incoming of body.questions) {
        if (!incoming.id) continue;
        const existing = existingQuestions.get(incoming.id);
        if (!existing) continue;
        if (existing.type !== incoming.type) {
          throw new AppError(
            409,
            "이미 응답이 존재하는 설문에서는 문항 유형을 변경할 수 없습니다.",
          );
        }
        const incomingOptionIds = new Set(
          incoming.options.map((o) => o.id).filter((v): v is string => Boolean(v)),
        );
        for (const option of existing.options) {
          if (!incomingOptionIds.has(option.id)) {
            throw new AppError(
              409,
              "이미 응답이 존재하는 설문에서는 선택지를 삭제할 수 없습니다.",
            );
          }
        }
      }
    }

    // 문항 id가 이 설문 소속인지 확인
    for (const incoming of body.questions) {
      if (incoming.id && !existingQuestions.has(incoming.id)) {
        throw new AppError(400, "잘못된 문항 정보가 포함되어 있습니다.");
      }
    }

    await prisma.$transaction(async (tx) => {
      // 삭제된 문항 제거
      for (const existing of survey.questions) {
        if (!incomingIds.has(existing.id)) {
          await tx.question.delete({ where: { id: existing.id } });
        }
      }

      for (const incoming of body.questions) {
        if (incoming.id) {
          const existing = existingQuestions.get(incoming.id)!;
          await tx.question.update({
            where: { id: incoming.id },
            data: {
              order: incoming.order,
              type: incoming.type,
              title: incoming.title,
              description: incoming.description ?? null,
              required: incoming.required,
              needsReview: incoming.needsReview ?? false,
            },
          });

          const incomingOptionIds = new Set(
            incoming.options
              .map((o) => o.id)
              .filter((v): v is string => Boolean(v)),
          );
          for (const option of existing.options) {
            if (!incomingOptionIds.has(option.id)) {
              await tx.questionOption.delete({ where: { id: option.id } });
            }
          }
          for (const option of incoming.options) {
            if (option.id) {
              await tx.questionOption.update({
                where: { id: option.id },
                data: { order: option.order, label: option.label },
              });
            } else {
              await tx.questionOption.create({
                data: {
                  questionId: incoming.id,
                  order: option.order,
                  label: option.label,
                },
              });
            }
          }
        } else {
          await tx.question.create({
            data: {
              surveyId: id,
              order: incoming.order,
              type: incoming.type,
              title: incoming.title,
              description: incoming.description ?? null,
              required: incoming.required,
              needsReview: incoming.needsReview ?? false,
              options: {
                create: incoming.options.map((o) => ({
                  order: o.order,
                  label: o.label,
                })),
              },
            },
          });
        }
      }

      // 구조가 바뀌었으므로 설문 버전 증가 (AI 분석 캐시 무효화 기준)
      await tx.survey.update({
        where: { id },
        data: { version: { increment: 1 } },
      });
    });

    await logAudit({
      actorRole: session.role,
      action: "survey.update_questions",
      targetType: "survey",
      targetId: id,
      metadata: { questionCount: body.questions.length },
    });

    const updated = await prisma.survey.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: "asc" },
          include: { options: { orderBy: { order: "asc" } } },
        },
      },
    });
    return { survey: updated };
  });
}

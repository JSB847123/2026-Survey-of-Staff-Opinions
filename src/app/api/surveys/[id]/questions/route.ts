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

    // 트랜잭션 왕복 횟수를 줄이기 위해 작업을 미리 분류한다.
    // (문항/선택지를 한 건씩 순차 실행하면 DB 왕복이 누적되어 트랜잭션이 타임아웃된다.)
    const questionIdsToDelete: string[] = [];
    const optionIdsToDelete: string[] = [];

    for (const existing of survey.questions) {
      if (!incomingIds.has(existing.id)) {
        questionIdsToDelete.push(existing.id);
        continue;
      }
      const incoming = body.questions.find((q) => q.id === existing.id);
      if (!incoming) continue;
      const keepOptionIds = new Set(
        incoming.options.map((o) => o.id).filter((v): v is string => Boolean(v)),
      );
      for (const option of existing.options) {
        if (!keepOptionIds.has(option.id)) optionIdsToDelete.push(option.id);
      }
    }

    await prisma.$transaction(
      async (tx) => {
        if (questionIdsToDelete.length > 0) {
          await tx.question.deleteMany({
            where: { id: { in: questionIdsToDelete } },
          });
        }
        if (optionIdsToDelete.length > 0) {
          await tx.questionOption.deleteMany({
            where: { id: { in: optionIdsToDelete } },
          });
        }

        for (const incoming of body.questions) {
          if (incoming.id) {
            const newOptions = incoming.options.filter((o) => !o.id);
            await tx.question.update({
              where: { id: incoming.id },
              data: {
                order: incoming.order,
                type: incoming.type,
                title: incoming.title,
                description: incoming.description ?? null,
                required: incoming.required,
                needsReview: incoming.needsReview ?? false,
                // 새 선택지는 문항 갱신과 같은 쿼리에서 함께 생성한다.
                options: {
                  create: newOptions.map((o) => ({
                    order: o.order,
                    label: o.label,
                    allowsText: o.allowsText,
                  })),
                },
              },
            });

            // 기존 선택지 순서/내용 변경은 값이 실제로 달라진 것만 갱신한다.
            const existing = existingQuestions.get(incoming.id)!;
            const existingOptions = new Map(
              existing.options.map((o) => [o.id, o]),
            );
            for (const option of incoming.options) {
              if (!option.id) continue;
              const before = existingOptions.get(option.id);
              if (
                before &&
                before.order === option.order &&
                before.label === option.label &&
                before.allowsText === option.allowsText
              ) {
                continue;
              }
              await tx.questionOption.update({
                where: { id: option.id },
                data: {
                  order: option.order,
                  label: option.label,
                  allowsText: option.allowsText,
                },
              });
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
                    allowsText: o.allowsText,
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
      },
      // 문항이 많은 설문도 안전하게 저장되도록 기본 5초보다 넉넉히 잡는다.
      { maxWait: 15_000, timeout: 60_000 },
    );

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

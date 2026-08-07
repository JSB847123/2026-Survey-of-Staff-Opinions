import { NextRequest } from "next/server";
import { handleApi } from "@/lib/api";
import { requireRespondent } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { submitAnswersSchema } from "@/lib/validation";
import { submitSurveyResponse, type ValidatedAnswer } from "@/lib/submit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const session = await requireRespondent();
    const body = submitAnswersSchema.parse(await request.json());

    const survey = await prisma.survey.findUnique({
      where: { id: body.surveyId },
      include: {
        questions: { include: { options: true } },
      },
    });
    if (!survey || survey.status !== "PUBLISHED") {
      throw new AppError(404, "진행 중인 설문을 찾을 수 없습니다.");
    }

    const account = await prisma.respondentAccount.findUnique({
      where: { id: session.accountId },
    });
    if (!account || !account.active) {
      throw new AppError(401, "로그인이 필요합니다.");
    }

    // 답변 서버 검증: 필수 문항 / 소속 문항·선택지 확인
    const answerMap = new Map(body.answers.map((a) => [a.questionId, a]));
    const validatedAnswers: ValidatedAnswer[] = [];

    for (const question of survey.questions) {
      const answer = answerMap.get(question.id);
      const optionIds = answer?.selectedOptionIds ?? [];
      const textValue = (answer?.textValue ?? "").trim();

      if (question.type === "CHECKBOX") {
        const validIds = new Set(question.options.map((o) => o.id));
        for (const optionId of optionIds) {
          if (!validIds.has(optionId)) {
            throw new AppError(400, "잘못된 선택지가 포함되어 있습니다.");
          }
        }
        if (question.required && optionIds.length === 0) {
          throw new AppError(
            400,
            `필수 문항에 응답해 주세요: ${question.title}`,
          );
        }
        if (optionIds.length > 0) {
          validatedAnswers.push({
            questionId: question.id,
            textValue: null,
            optionIds: [...new Set(optionIds)],
          });
        }
      } else {
        if (question.required && textValue.length === 0) {
          throw new AppError(
            400,
            `필수 문항에 응답해 주세요: ${question.title}`,
          );
        }
        if (textValue.length > 0) {
          validatedAnswers.push({
            questionId: question.id,
            textValue,
            optionIds: [],
          });
        }
      }
    }

    // 알 수 없는 questionId 거부
    const knownIds = new Set(survey.questions.map((q) => q.id));
    for (const a of body.answers) {
      if (!knownIds.has(a.questionId)) {
        throw new AppError(400, "잘못된 문항 정보가 포함되어 있습니다.");
      }
    }

    await submitSurveyResponse(prisma, survey.id, account.id, validatedAnswers);

    return { ok: true };
  });
}

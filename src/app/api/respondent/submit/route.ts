import { NextRequest } from "next/server";
import { handleApi } from "@/lib/api";
import { requireRespondent } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { submitAnswersSchema } from "@/lib/validation";
import { OTHER_TEXT_MAX_LENGTH } from "@/lib/constants";
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
        const optionsById = new Map(question.options.map((o) => [o.id, o]));
        for (const optionId of optionIds) {
          if (!optionsById.has(optionId)) {
            throw new AppError(400, "잘못된 선택지가 포함되어 있습니다.");
          }
        }
        if (question.required && optionIds.length === 0) {
          throw new AppError(
            400,
            `필수 문항에 응답해 주세요: ${question.title}`,
          );
        }

        // '기타'처럼 직접 입력이 필요한 선택지를 고른 경우에만 단답을 저장한다.
        const uniqueOptionIds = [...new Set(optionIds)];
        const otherOption = uniqueOptionIds
          .map((optionId) => optionsById.get(optionId)!)
          .find((option) => option.allowsText);

        let otherText: string | null = null;
        if (otherOption) {
          if (textValue.length > OTHER_TEXT_MAX_LENGTH) {
            throw new AppError(
              400,
              `'${otherOption.label}' 항목은 ${OTHER_TEXT_MAX_LENGTH}자 이내로 입력해 주세요.`,
            );
          }
          if (question.required && textValue.length === 0) {
            throw new AppError(
              400,
              `'${otherOption.label}'을(를) 선택하셨습니다. 내용을 입력해 주세요.`,
            );
          }
          otherText = textValue.length > 0 ? textValue : null;
        }

        if (uniqueOptionIds.length > 0) {
          validatedAnswers.push({
            questionId: question.id,
            textValue: otherText,
            optionIds: uniqueOptionIds,
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

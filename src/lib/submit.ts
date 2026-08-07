import "server-only";
import { Prisma, type PrismaClient } from "@prisma/client";
import { AppError } from "./errors";
import { ALREADY_SUBMITTED_MESSAGE } from "./constants";

export type ValidatedAnswer = {
  questionId: string;
  textValue: string | null;
  optionIds: string[];
};

/**
 * 응답 제출 트랜잭션.
 * - responseCount를 조건부 UPDATE로 원자적으로 증가시켜
 *   동시 제출 상황에서도 maxRespondents(13명)를 절대 초과하지 않는다.
 * - unique(respondentAccountId) 제약이 중복 제출을 차단하고,
 *   실패 시 responseCount 증가도 함께 롤백된다.
 */
export async function submitSurveyResponse(
  db: PrismaClient,
  surveyId: string,
  accountId: string,
  answers: ValidatedAnswer[],
): Promise<void> {
  try {
    await db.$transaction(
      async (tx) => {
        const updated = await tx.$executeRaw`
        UPDATE "Survey"
        SET "responseCount" = "responseCount" + 1
        WHERE "id" = ${surveyId}
          AND "status" = 'PUBLISHED'::"SurveyStatus"
          AND "responseCount" < "maxRespondents"`;
        if (updated === 0) {
          throw new AppError(
            409,
            "설문 정원이 가득 차서 더 이상 응답을 제출할 수 없습니다.",
          );
        }

        const response = await tx.surveyResponse.create({
          data: { surveyId, respondentAccountId: accountId },
        });

        for (const answer of answers) {
          await tx.answer.create({
            data: {
              responseId: response.id,
              questionId: answer.questionId,
              textValue: answer.textValue,
              selections: {
                create: answer.optionIds.map((optionId) => ({ optionId })),
              },
            },
          });
        }
      },
      // 문항이 많은 설문에서도 제출이 중간에 끊기지 않도록 기본 5초보다 넉넉히 잡는다.
      { maxWait: 15_000, timeout: 60_000 },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError(409, ALREADY_SUBMITTED_MESSAGE);
    }
    throw error;
  }
}

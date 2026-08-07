/**
 * 실제 DB(DATABASE_URL)를 사용하는 통합 테스트.
 * - 설문별 최대 13명 제한이 DB 수준에서 지켜지는지
 * - 동일 계정 중복 제출이 DB constraint로 차단되는지
 * - 동시 제출 race condition에서도 정원을 초과하지 않는지
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { submitSurveyResponse } from "@/lib/submit";
import { AppError } from "@/lib/errors";
import { MAX_RESPONDENTS_PER_SURVEY } from "@/lib/constants";

const hasDb = Boolean(process.env.DATABASE_URL);
const describeDb = hasDb ? describe : describe.skip;

describeDb("submitSurveyResponse (DB 통합)", () => {
  const prisma = new PrismaClient();
  let surveyId: string;
  let accountIds: string[] = [];

  beforeAll(async () => {
    const survey = await prisma.survey.create({
      data: {
        title: "통합 테스트 설문",
        slug: `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        status: "PUBLISHED",
        questions: {
          create: [
            {
              order: 1,
              type: "LONG_TEXT",
              title: "의견을 작성해 주세요.",
              required: false,
            },
          ],
        },
      },
    });
    surveyId = survey.id;

    // 15개 계정 생성 (13명 제한 + 초과분 테스트용) — 계정 상한과 별개로 제출 상한을 검증
    const created = await Promise.all(
      Array.from({ length: 15 }, (_, i) =>
        prisma.respondentAccount.create({
          data: {
            surveyId,
            loginId: String(i).padStart(4, "0"),
            passwordHash: "test-hash",
          },
        }),
      ),
    );
    accountIds = created.map((a) => a.id);
  });

  afterAll(async () => {
    if (surveyId) {
      await prisma.survey.delete({ where: { id: surveyId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it("첫 제출은 성공한다", async () => {
    await submitSurveyResponse(prisma, surveyId, accountIds[0], [])
    const survey = await prisma.survey.findUniqueOrThrow({
      where: { id: surveyId },
    });
    expect(survey.responseCount).toBe(1);
  });

  it("동일 계정 재제출은 지정된 메시지로 실패한다", async () => {
    await expect(
      submitSurveyResponse(prisma, surveyId, accountIds[0], []),
    ).rejects.toThrow("이미 설문 응답을 완료했습니다.");
    const survey = await prisma.survey.findUniqueOrThrow({
      where: { id: surveyId },
    });
    // 실패 시 responseCount 증가도 롤백되어야 한다
    expect(survey.responseCount).toBe(1);
  });

  it("13명까지 성공하고 14번째는 DB 수준에서 차단된다 (동시 제출 포함)", async () => {
    // 남은 14개 계정으로 동시에 제출 → 12명만 추가 성공해야 한다 (1명 기존 제출)
    const results = await Promise.allSettled(
      accountIds.slice(1).map((accountId) =>
        submitSurveyResponse(prisma, surveyId, accountId, []),
      ),
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected");

    expect(succeeded).toBe(MAX_RESPONDENTS_PER_SURVEY - 1);
    expect(failed.length).toBe(accountIds.length - MAX_RESPONDENTS_PER_SURVEY);
    for (const f of failed) {
      expect((f as PromiseRejectedResult).reason).toBeInstanceOf(AppError);
    }

    const survey = await prisma.survey.findUniqueOrThrow({
      where: { id: surveyId },
    });
    expect(survey.responseCount).toBe(MAX_RESPONDENTS_PER_SURVEY);

    const responseCount = await prisma.surveyResponse.count({
      where: { surveyId },
    });
    expect(responseCount).toBe(MAX_RESPONDENTS_PER_SURVEY);
  }, 60_000);

  it("정원이 가득 찬 뒤의 제출은 실패한다", async () => {
    const extra = await prisma.respondentAccount.findFirst({
      where: { surveyId, response: null },
    });
    expect(extra).not.toBeNull();
    await expect(
      submitSurveyResponse(prisma, surveyId, extra!.id, []),
    ).rejects.toThrow(/정원이 가득/);
  });
});

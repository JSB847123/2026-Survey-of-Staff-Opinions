/**
 * 실제 DB(DATABASE_URL)를 사용하는 통합 테스트.
 * - 설문별 최대 인원 제한이 DB 수준에서 지켜지는지
 * - 동일 계정 중복 제출이 DB constraint로 차단되는지
 * - 동시 제출 race condition에서도 정원을 초과하지 않는지
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { submitSurveyResponse } from "@/lib/submit";
import { AppError } from "@/lib/errors";
import { DEFAULT_MAX_RESPONDENTS } from "@/lib/constants";

const hasDb = Boolean(process.env.DATABASE_URL);
const describeDb = hasDb ? describe : describe.skip;

/** 이 설문의 정원 (기본값으로 고정해 다른 테스트의 전역 설정 변경과 격리) */
const LIMIT = DEFAULT_MAX_RESPONDENTS;
const EXTRA_ACCOUNTS = 2;

describeDb("submitSurveyResponse (DB 통합)", () => {
  const prisma = new PrismaClient();
  const runId = randomUUID().slice(0, 8);
  let surveyId: string;
  let accountIds: string[] = [];

  beforeAll(async () => {
    const survey = await prisma.survey.create({
      data: {
        title: "통합 테스트 설문",
        slug: `test-${runId}`,
        status: "PUBLISHED",
        maxRespondents: LIMIT,
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

    // 정원 초과 검증을 위해 정원보다 많은 계정을 직접 생성한다.
    // (회원가입 상한과 별개로 '설문당 제출 상한'을 검증하는 테스트)
    const created = await Promise.all(
      Array.from({ length: LIMIT + EXTRA_ACCOUNTS }, (_, i) =>
        prisma.respondentAccount.create({
          data: {
            loginId: `t${runId}${String(i).padStart(2, "0")}`,
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
    await prisma.respondentAccount
      .deleteMany({ where: { id: { in: accountIds } } })
      .catch(() => {});
    await prisma.$disconnect();
  });

  it("첫 제출은 성공한다", async () => {
    await submitSurveyResponse(prisma, surveyId, accountIds[0], []);
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

  it("정원까지만 성공하고 초과분은 DB 수준에서 차단된다 (동시 제출 포함)", async () => {
    // 남은 계정으로 동시에 제출 → 정원까지만 성공해야 한다 (1명 기존 제출)
    const results = await Promise.allSettled(
      accountIds
        .slice(1)
        .map((accountId) => submitSurveyResponse(prisma, surveyId, accountId, [])),
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected");

    expect(succeeded).toBe(LIMIT - 1);
    expect(failed.length).toBe(EXTRA_ACCOUNTS);
    for (const f of failed) {
      expect((f as PromiseRejectedResult).reason).toBeInstanceOf(AppError);
    }

    const survey = await prisma.survey.findUniqueOrThrow({
      where: { id: surveyId },
    });
    expect(survey.responseCount).toBe(LIMIT);

    const responseCount = await prisma.surveyResponse.count({
      where: { surveyId },
    });
    expect(responseCount).toBe(LIMIT);
  }, 60_000);

  it("정원이 가득 찬 뒤의 제출은 실패한다", async () => {
    const submitted = new Set(
      (
        await prisma.surveyResponse.findMany({
          where: { surveyId },
          select: { respondentAccountId: true },
        })
      ).map((r) => r.respondentAccountId),
    );
    const extra = accountIds.find((id) => !submitted.has(id));
    expect(extra).toBeTruthy();
    await expect(
      submitSurveyResponse(prisma, surveyId, extra!, []),
    ).rejects.toThrow(/정원이 가득/);
  });
});

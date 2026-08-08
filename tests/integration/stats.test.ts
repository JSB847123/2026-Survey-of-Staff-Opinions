/**
 * 설문 현황 숫자(제출/미제출/응답률)의 일관성 검증.
 * 응답자 계정은 전역이므로 절대값 대신 관계식(불변식)을 검증한다.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { computeSurveyStats } from "@/lib/stats";

const hasDb = Boolean(process.env.DATABASE_URL);
const describeDb = hasDb ? describe : describe.skip;

describeDb("설문 현황 통계 (DB 통합)", () => {
  const prisma = new PrismaClient();
  const runId = randomUUID().slice(0, 6);
  let surveyId = "";
  const accountIds: string[] = [];
  /** 테스트 시작 시점의 기존 활성 계정 수 */
  let baseActive = 0;

  beforeAll(async () => {
    baseActive = await prisma.respondentAccount.count({
      where: { active: true },
    });

    const survey = await prisma.survey.create({
      data: {
        title: "통계 검증 설문",
        slug: `stats-${runId}`,
        status: "PUBLISHED",
      },
    });
    surveyId = survey.id;

    // 활성 2명 + 비활성 1명 추가
    for (let i = 0; i < 3; i++) {
      const account = await prisma.respondentAccount.create({
        data: {
          loginId: `s${runId}${i}`,
          passwordHash: "test-hash",
          active: i < 2,
        },
      });
      accountIds.push(account.id);
    }
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

  it("아무도 제출하지 않으면 미제출 = 활성 계정 수, 응답률 0%", async () => {
    const stats = await computeSurveyStats(surveyId);
    expect(stats.submittedCount).toBe(0);
    // 기존 활성 계정 + 이번에 만든 활성 2명
    expect(stats.notSubmittedCount).toBe(baseActive + 2);
    expect(stats.responseRate).toBe(0);
    // 제출 + 미제출 = 참여 대상
    expect(stats.submittedCount + stats.notSubmittedCount).toBe(
      stats.respondentTotal,
    );
  });

  it("활성 계정이 제출하면 제출/미제출/응답률이 함께 맞아떨어진다", async () => {
    await prisma.surveyResponse.create({
      data: { surveyId, respondentAccountId: accountIds[0] },
    });

    const stats = await computeSurveyStats(surveyId);
    expect(stats.submittedCount).toBe(1);
    expect(stats.notSubmittedCount).toBe(baseActive + 1);
    expect(stats.submittedCount + stats.notSubmittedCount).toBe(
      stats.respondentTotal,
    );

    // 응답률은 제출 / (제출 + 미제출)과 일치한다
    const expected =
      Math.round(
        (stats.submittedCount /
          (stats.submittedCount + stats.notSubmittedCount)) *
          1000,
      ) / 10;
    expect(stats.responseRate).toBe(expected);
  });

  it("비활성 계정이 제출한 경우에도 숫자가 어긋나지 않는다", async () => {
    // 비활성 계정(index 2)이 제출 → 미제출은 활성 미제출자만 센다
    await prisma.surveyResponse.create({
      data: { surveyId, respondentAccountId: accountIds[2] },
    });

    const stats = await computeSurveyStats(surveyId);
    expect(stats.submittedCount).toBe(2);
    // 활성 미제출자 수는 비활성 제출과 무관하게 유지된다
    expect(stats.notSubmittedCount).toBe(baseActive + 1);
    // 예전 방식(활성 계정 - 제출)이었다면 음수가 되어 0으로 잘렸을 상황
    expect(stats.notSubmittedCount).toBeGreaterThanOrEqual(0);
    // 응답률은 항상 0~100% 범위 안에 있다
    expect(stats.responseRate).toBeGreaterThanOrEqual(0);
    expect(stats.responseRate).toBeLessThanOrEqual(100);
  });
});

/**
 * 전역 최대 인원 설정(1~20명) 통합 테스트.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { getMaxRespondents, setMaxRespondents } from "@/lib/settings";
import { AppError } from "@/lib/errors";

const hasDb = Boolean(process.env.DATABASE_URL);
const describeDb = hasDb ? describe : describe.skip;

describeDb("최대 인원 설정 (DB 통합)", () => {
  const prisma = new PrismaClient();
  let original = 13;
  let surveyId = "";

  beforeAll(async () => {
    original = await getMaxRespondents();
    const survey = await prisma.survey.create({
      data: {
        title: "설정 테스트 설문",
        slug: `settings-${randomUUID().slice(0, 8)}`,
        status: "DRAFT",
      },
    });
    surveyId = survey.id;
  });

  afterAll(async () => {
    if (surveyId) {
      await prisma.survey.delete({ where: { id: surveyId } }).catch(() => {});
    }
    await setMaxRespondents(original).catch(() => {});
    await prisma.$disconnect();
  });

  it("1~20 범위 안의 값으로 변경된다", async () => {
    expect(await setMaxRespondents(20)).toBe(20);
    expect(await getMaxRespondents()).toBe(20);
    expect(await setMaxRespondents(1)).toBe(1);
    expect(await getMaxRespondents()).toBe(1);
  });

  it("변경 시 기존 설문의 maxRespondents에도 반영된다", async () => {
    await setMaxRespondents(17);
    const survey = await prisma.survey.findUniqueOrThrow({
      where: { id: surveyId },
    });
    expect(survey.maxRespondents).toBe(17);
  });

  it("범위를 벗어난 값은 거부한다", async () => {
    await expect(setMaxRespondents(0)).rejects.toThrow(AppError);
    await expect(setMaxRespondents(21)).rejects.toThrow(AppError);
    await expect(setMaxRespondents(2.5)).rejects.toThrow(AppError);
  });

  it("이미 제출된 응답 수보다 작게 줄일 수 없다", async () => {
    await prisma.survey.update({
      where: { id: surveyId },
      data: { responseCount: 5 },
    });
    await expect(setMaxRespondents(3)).rejects.toThrow(/줄일 수 없습니다/);
    await prisma.survey.update({
      where: { id: surveyId },
      data: { responseCount: 0 },
    });
  });
});

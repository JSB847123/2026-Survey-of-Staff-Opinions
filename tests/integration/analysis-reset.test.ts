/**
 * 분석 결과·기록 초기화 통합 테스트.
 * (AI를 실제 호출하지 않고 분석 레코드를 직접 만들어 삭제 동작만 검증한다)
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient, type Prisma } from "@prisma/client";

const hasDb = Boolean(process.env.DATABASE_URL);
const describeDb = hasDb ? describe : describe.skip;

const RESULT_JSON = {
  overallTrend: "테스트",
  positives: [],
  improvements: [],
  keyChoiceFindings: [],
  recurringThemes: [],
  alignmentAndConflicts: [],
  organizationalSignals: [],
  actionableRecommendations: [],
  interpretationCautions: [],
} as unknown as Prisma.InputJsonValue;

describeDb("AI 분석 기록 초기화 (DB 통합)", () => {
  const prisma = new PrismaClient();
  let surveyId: string;

  const seedAnalyses = async () => {
    await prisma.analysis.createMany({
      data: [
        {
          surveyId,
          provider: "openai",
          model: "gpt-5.6-luna",
          resultJson: RESULT_JSON,
          resultMarkdown: "## 테스트",
          responseCount: 1,
          surveyVersion: 1,
          createdByRole: "admin",
        },
        {
          surveyId,
          provider: "deepseek",
          model: "deepseek-v4-flash",
          resultJson: RESULT_JSON,
          resultMarkdown: "## 테스트",
          responseCount: 1,
          surveyVersion: 1,
          createdByRole: "reviewer",
        },
      ],
    });
  };

  beforeAll(async () => {
    const survey = await prisma.survey.create({
      data: {
        title: "분석 초기화 테스트 설문",
        slug: `analysis-${randomUUID().slice(0, 8)}`,
        status: "PUBLISHED",
      },
    });
    surveyId = survey.id;
  });

  afterAll(async () => {
    if (surveyId) {
      await prisma.survey.delete({ where: { id: surveyId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it("provider를 지정하면 해당 모델 기록만 삭제된다", async () => {
    await seedAnalyses();
    const result = await prisma.analysis.deleteMany({
      where: { surveyId, provider: "openai" },
    });
    expect(result.count).toBe(1);

    const remaining = await prisma.analysis.findMany({ where: { surveyId } });
    expect(remaining).toHaveLength(1);
    expect(remaining[0].provider).toBe("deepseek");
  });

  it("provider 없이 삭제하면 모든 기록이 지워진다", async () => {
    await prisma.analysis.deleteMany({ where: { surveyId } });
    await seedAnalyses();

    const result = await prisma.analysis.deleteMany({ where: { surveyId } });
    expect(result.count).toBe(2);
    expect(await prisma.analysis.count({ where: { surveyId } })).toBe(0);
  });

  it("분석 기록을 지워도 설문과 응답은 유지된다", async () => {
    await seedAnalyses();
    await prisma.analysis.deleteMany({ where: { surveyId } });

    const survey = await prisma.survey.findUnique({ where: { id: surveyId } });
    expect(survey).not.toBeNull();
    expect(survey!.title).toBe("분석 초기화 테스트 설문");
  });
});

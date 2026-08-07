import { describe, expect, it } from "vitest";
import { extractSurveyStructure } from "@/lib/parsing/extract";

describe("extractSurveyStructure", () => {
  it("문제번호와 체크박스 선택지를 문항으로 변환한다", () => {
    const doc = extractSurveyStructure([
      "2026 직원 의견 설문조사",
      "1. 근무환경에 만족하십니까?",
      "□ 매우 만족",
      "□ 만족",
      "□ 보통",
      "□ 불만족",
      "□ 매우 불만족",
    ]);
    expect(doc.title).toBe("2026 직원 의견 설문조사");
    expect(doc.questions).toHaveLength(1);
    const q = doc.questions[0];
    expect(q.type).toBe("CHECKBOX");
    expect(q.title).toBe("근무환경에 만족하십니까?");
    expect(q.options.map((o) => o.label)).toEqual([
      "매우 만족",
      "만족",
      "보통",
      "불만족",
      "매우 불만족",
    ]);
    expect(q.needsReview).toBe(false);
  });

  it("한 줄에 여러 체크박스가 있어도 모두 분리한다", () => {
    const doc = extractSurveyStructure([
      "1. 만족도는?",
      "□ 매우 만족 □ 만족 ☑ 보통 ■ 불만족 ▢ 매우 불만족",
    ]);
    expect(doc.questions[0].options).toHaveLength(5);
  });

  it("다양한 문제번호 형식을 인식한다", () => {
    const doc = extractSurveyStructure([
      "1. 첫 번째 질문 □ 예 □ 아니오",
      "2) 두 번째 질문 □ 예 □ 아니오",
      "1-1. 세부 질문 □ 예 □ 아니오",
      "문1. 네 번째 질문 □ 예 □ 아니오",
      "문 2. 다섯 번째 질문 □ 예 □ 아니오",
    ]);
    expect(doc.questions).toHaveLength(5);
    expect(doc.questions.map((q) => q.title)).toEqual([
      "첫 번째 질문",
      "두 번째 질문",
      "세부 질문",
      "네 번째 질문",
      "다섯 번째 질문",
    ]);
  });

  it("주관식 키워드가 있으면 LONG_TEXT로 판단한다", () => {
    const doc = extractSurveyStructure([
      "1. 기타 의견이나 건의사항을 자유롭게 작성해 주세요.",
    ]);
    expect(doc.questions[0].type).toBe("LONG_TEXT");
    expect(doc.questions[0].needsReview).toBe(false);
  });

  it("유형이 불확실한 문항은 내용을 만들지 않고 확인 필요로 표시한다", () => {
    const doc = extractSurveyStructure(["1. 이 문항은 유형 단서가 없습니다"]);
    expect(doc.questions[0].needsReview).toBe(true);
    expect(doc.warnings.length).toBeGreaterThan(0);
  });

  it("문항이 없으면 warning을 남긴다", () => {
    const doc = extractSurveyStructure(["그냥 일반 문서입니다"]);
    expect(doc.questions).toHaveLength(0);
    expect(doc.warnings.some((w) => w.includes("찾지 못했습니다"))).toBe(true);
  });
});

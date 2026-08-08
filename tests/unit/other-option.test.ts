import { describe, expect, it } from "vitest";
import { extractSurveyStructure } from "@/lib/parsing/extract";
import {
  looksLikeOtherOption,
  OTHER_TEXT_MAX_LENGTH,
} from "@/lib/constants";

describe("'기타' 선택지 인식", () => {
  it("기타/직접 입력 표현을 인식한다", () => {
    expect(looksLikeOtherOption("기타")).toBe(true);
    expect(looksLikeOtherOption("기타(          )")).toBe(true);
    expect(looksLikeOtherOption("직접 입력")).toBe(true);
    expect(looksLikeOtherOption("직접입력")).toBe(true);
    expect(looksLikeOtherOption("매우 만족")).toBe(false);
    expect(looksLikeOtherOption("보통")).toBe(false);
  });

  it("파서가 '기타' 선택지에 직접 입력 플래그를 세운다", () => {
    const doc = extractSurveyStructure([
      "1. 가장 시급한 개선 과제는?",
      "□ 업무 분장 □ 시설 개선 □ 기타",
    ]);
    const options = doc.questions[0].options;
    expect(options).toHaveLength(3);
    expect(options[0].allowsText).toBe(false);
    expect(options[1].allowsText).toBe(false);
    expect(options[2].label).toBe("기타");
    expect(options[2].allowsText).toBe(true);
  });

  it("일반 선택지에는 플래그가 서지 않는다", () => {
    const doc = extractSurveyStructure([
      "1. 만족도는?",
      "□ 매우 만족 □ 만족 □ 보통",
    ]);
    expect(doc.questions[0].options.every((o) => !o.allowsText)).toBe(true);
  });

  it("단답 최대 길이는 20자다", () => {
    expect(OTHER_TEXT_MAX_LENGTH).toBe(20);
  });
});

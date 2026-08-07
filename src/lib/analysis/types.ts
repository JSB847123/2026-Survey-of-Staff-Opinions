import { z } from "zod";

/** AI에 전달되는 익명화된 입력 (응답자 식별정보 없음) */
export type SurveyAnalysisInput = {
  surveyTitle: string;
  surveyDescription?: string;
  respondentCount: number;
  maxRespondents: number;
  choiceStats: {
    questionTitle: string;
    options: { label: string; count: number; percentage: number }[];
  }[];
  textAnswers: {
    questionTitle: string;
    answers: string[];
  }[];
};

export const surveyAnalysisResultSchema = z.object({
  overallTrend: z.string().describe("전체 응답 경향"),
  positives: z.array(z.string()).describe("긍정적인 부분"),
  improvements: z.array(z.string()).describe("개선이 필요한 부분"),
  keyChoiceFindings: z.array(z.string()).describe("객관식 핵심 결과"),
  recurringThemes: z.array(z.string()).describe("주관식 반복 테마"),
  alignmentAndConflicts: z
    .array(z.string())
    .describe("객관식과 주관식이 일치/충돌하는 부분"),
  organizationalSignals: z
    .array(z.string())
    .describe("조직 운영상 주목할 신호"),
  actionableRecommendations: z
    .array(z.string())
    .describe("실행 가능한 개선방안"),
  interpretationCautions: z
    .array(z.string())
    .describe("표본이 작아 해석에 주의해야 할 부분"),
});

export type SurveyAnalysisResult = z.infer<typeof surveyAnalysisResultSchema>;

export interface SurveyAnalysisProvider {
  id: string;
  model: string;
  analyze(input: SurveyAnalysisInput): Promise<SurveyAnalysisResult>;
}

const SECTION_TITLES: [keyof SurveyAnalysisResult, string][] = [
  ["overallTrend", "전체 응답 경향"],
  ["positives", "긍정적인 부분"],
  ["improvements", "개선이 필요한 부분"],
  ["keyChoiceFindings", "객관식 핵심 결과"],
  ["recurringThemes", "주관식 반복 테마"],
  ["alignmentAndConflicts", "객관식·주관식 일치/충돌"],
  ["organizationalSignals", "조직 운영상 주목할 신호"],
  ["actionableRecommendations", "실행 가능한 개선방안"],
  ["interpretationCautions", "해석 시 주의사항"],
];

export function analysisResultToMarkdown(result: SurveyAnalysisResult): string {
  const parts: string[] = [];
  for (const [key, title] of SECTION_TITLES) {
    const value = result[key];
    parts.push(`## ${title}`);
    if (typeof value === "string") {
      parts.push(value);
    } else if (value.length === 0) {
      parts.push("- (해당 없음)");
    } else {
      parts.push(value.map((v) => `- ${v}`).join("\n"));
    }
    parts.push("");
  }
  return parts.join("\n").trim();
}

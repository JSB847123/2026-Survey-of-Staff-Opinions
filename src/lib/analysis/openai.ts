import "server-only";
import OpenAI from "openai";
import { AppError } from "../errors";
import { buildUserPrompt, systemPromptFor } from "./prompt";
import { ANALYSIS_JSON_SCHEMA } from "./json-schema";
import {
  surveyAnalysisResultSchema,
  type SurveyAnalysisInput,
  type SurveyAnalysisProvider,
  type SurveyAnalysisResult,
} from "./types";

export const OPENAI_MODEL = "gpt-5.6-luna";

export const OpenAISurveyAnalysisProvider: SurveyAnalysisProvider = {
  id: "openai",
  model: OPENAI_MODEL,

  async analyze(input: SurveyAnalysisInput): Promise<SurveyAnalysisResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new AppError(
        503,
        "OPENAI_API_KEY 환경변수가 설정되지 않았습니다. 관리자에게 문의해 주세요.",
      );
    }

    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPromptFor(input) },
        { role: "user", content: buildUserPrompt(input) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "survey_analysis",
          strict: true,
          schema: ANALYSIS_JSON_SCHEMA as unknown as Record<string, unknown>,
        },
      },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new AppError(502, "AI 분석 응답이 비어 있습니다.");
    }
    return parseAnalysisJson(content);
  },
};

export function parseAnalysisJson(content: string): SurveyAnalysisResult {
  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch {
    throw new AppError(502, "AI 분석 결과를 해석할 수 없습니다. 다시 시도해 주세요.");
  }
  const parsed = surveyAnalysisResultSchema.safeParse(json);
  if (!parsed.success) {
    throw new AppError(
      502,
      "AI 분석 결과 형식이 올바르지 않습니다. 다시 시도해 주세요.",
    );
  }
  return parsed.data;
}

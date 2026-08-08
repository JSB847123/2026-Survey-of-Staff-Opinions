import "server-only";
import OpenAI from "openai";
import { AppError } from "../errors";
import { getAiApiKey } from "../ai-keys";
import { buildUserPrompt, systemPromptFor } from "./prompt";
import { ANALYSIS_JSON_SCHEMA } from "./json-schema";
import { parseAnalysisJson } from "./openai";
import type {
  SurveyAnalysisInput,
  SurveyAnalysisProvider,
  SurveyAnalysisResult,
} from "./types";

export const DEEPSEEK_MODEL = "deepseek-v4-flash";

export const DeepSeekSurveyAnalysisProvider: SurveyAnalysisProvider = {
  id: "deepseek",
  model: DEEPSEEK_MODEL,

  async analyze(input: SurveyAnalysisInput): Promise<SurveyAnalysisResult> {
    const apiKey = await getAiApiKey("deepseek");
    if (!apiKey) {
      throw new AppError(
        503,
        "DeepSeek API 키가 설정되지 않았습니다. 관리자가 [시스템 설정] 화면에서 키를 입력해 주세요.",
      );
    }

    const client = new OpenAI({ apiKey, baseURL: "https://api.deepseek.com" });
    const completion = await client.chat.completions.create({
      model: DEEPSEEK_MODEL,
      messages: [
        {
          role: "system",
          content: `${systemPromptFor(input)}\n\n출력은 반드시 다음 JSON Schema를 따르는 JSON 객체여야 합니다:\n${JSON.stringify(ANALYSIS_JSON_SCHEMA)}`,
        },
        { role: "user", content: buildUserPrompt(input) },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new AppError(502, "AI 분석 응답이 비어 있습니다.");
    }
    return parseAnalysisJson(content);
  },
};

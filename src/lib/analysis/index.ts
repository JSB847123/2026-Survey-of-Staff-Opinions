import "server-only";
import { AppError } from "../errors";
import { OpenAISurveyAnalysisProvider } from "./openai";
import { DeepSeekSurveyAnalysisProvider } from "./deepseek";
import type { SurveyAnalysisProvider } from "./types";

export {
  analysisResultToMarkdown,
  surveyAnalysisResultSchema,
} from "./types";
export type {
  SurveyAnalysisInput,
  SurveyAnalysisProvider,
  SurveyAnalysisResult,
} from "./types";

const providers: Record<string, SurveyAnalysisProvider> = {
  openai: OpenAISurveyAnalysisProvider,
  deepseek: DeepSeekSurveyAnalysisProvider,
};

export function getAnalysisProvider(id: string): SurveyAnalysisProvider {
  const provider = providers[id];
  if (!provider) {
    throw new AppError(400, "지원하지 않는 AI provider입니다.");
  }
  return provider;
}

export const PROVIDER_LABELS: Record<string, string> = {
  openai: "GPT-5.6 Luna",
  deepseek: "DeepSeek V4 Flash",
};

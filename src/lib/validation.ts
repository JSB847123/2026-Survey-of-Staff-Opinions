import { z } from "zod";
import { MAX_RESPONDENT_LIMIT, MIN_RESPONDENT_LIMIT } from "./constants";

export const maxRespondentsSchema = z.object({
  maxRespondents: z
    .number()
    .int(`최대 인원은 정수로 입력해 주세요.`)
    .min(
      MIN_RESPONDENT_LIMIT,
      `최대 인원은 ${MIN_RESPONDENT_LIMIT}명 이상이어야 합니다.`,
    )
    .max(
      MAX_RESPONDENT_LIMIT,
      `최대 인원은 ${MAX_RESPONDENT_LIMIT}명 이하여야 합니다.`,
    ),
});

/** 숫자 정확히 4자리 (예: "0012" 허용 — 반드시 string으로 처리) */
export const fourDigitSchema = z
  .string()
  .regex(/^\d{4}$/, "숫자 4자리를 입력해 주세요.");

export const staffLoginSchema = z.object({
  accessCode: z
    .string()
    .min(1, "Access Code를 입력해 주세요.")
    .max(64, "Access Code가 너무 깁니다."),
  role: z.enum(["admin", "reviewer"]),
});

export const respondentLoginSchema = z.object({
  loginId: fourDigitSchema,
  password: fourDigitSchema,
});

export const respondentSignupSchema = z.object({
  loginId: fourDigitSchema,
  password: fourDigitSchema,
});

export const surveyMetaSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력해 주세요.").max(200),
  description: z.string().trim().max(2000).optional().nullable(),
});

export const questionTypeSchema = z.enum(["CHECKBOX", "SHORT_TEXT", "LONG_TEXT"]);

export const questionEditSchema = z.object({
  id: z.string().optional(), // 없으면 신규
  order: z.number().int().min(1),
  type: questionTypeSchema,
  title: z.string().trim().min(1, "문항 제목을 입력해 주세요.").max(500),
  description: z.string().trim().max(2000).optional().nullable(),
  required: z.boolean(),
  needsReview: z.boolean().optional().default(false),
  options: z
    .array(
      z.object({
        id: z.string().optional(),
        order: z.number().int().min(1),
        label: z.string().trim().min(1, "선택지 내용을 입력해 주세요.").max(300),
      }),
    )
    .max(50),
});

export const questionsSaveSchema = z.object({
  questions: z.array(questionEditSchema).max(100),
});

export const publishActionSchema = z.object({
  action: z.enum(["publish", "unpublish", "close"]),
});

export const respondentCreateSchema = z.object({
  loginId: fourDigitSchema,
  password: fourDigitSchema,
});

export const respondentUpdateSchema = z.object({
  active: z.boolean().optional(),
  password: fourDigitSchema.optional(),
});

export const submitAnswersSchema = z.object({
  surveyId: z.string().min(1),
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        selectedOptionIds: z.array(z.string().min(1)).max(50).optional(),
        textValue: z.string().max(5000).optional(),
      }),
    )
    .max(100),
});

export const analysisRunSchema = z.object({
  provider: z.enum(["openai", "deepseek"]),
  force: z.boolean().optional().default(false),
});

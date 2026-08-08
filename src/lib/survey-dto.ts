/** 클라이언트 컴포넌트와 공유하는 설문 DTO 타입 */
export type SurveyOptionDto = {
  id: string;
  order: number;
  label: string;
  /** '기타'처럼 선택 후 직접 입력(단답)이 필요한 선택지 */
  allowsText: boolean;
};

export type SurveyQuestionDto = {
  id: string;
  order: number;
  type: "CHECKBOX" | "SHORT_TEXT" | "LONG_TEXT";
  title: string;
  description: string | null;
  required: boolean;
  needsReview: boolean;
  options: SurveyOptionDto[];
};

export type SurveyDto = {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  responseCount: number;
  maxRespondents: number;
  questions: SurveyQuestionDto[];
};

export const QUESTION_TYPE_LABEL: Record<SurveyQuestionDto["type"], string> = {
  CHECKBOX: "객관식(체크박스)",
  SHORT_TEXT: "주관식(단답)",
  LONG_TEXT: "주관식(서술)",
};

export const SURVEY_STATUS_LABEL: Record<SurveyDto["status"], string> = {
  DRAFT: "작성 중",
  PUBLISHED: "진행 중",
  CLOSED: "종료",
};

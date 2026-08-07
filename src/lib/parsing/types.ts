import type { QuestionType } from "@prisma/client";

export type UploadedFile = {
  name: string;
  size: number;
  mimeType: string;
  buffer: Buffer;
};

export type ParsedOption = {
  order: number;
  label: string;
};

export type ParsedQuestion = {
  order: number;
  type: QuestionType;
  title: string;
  description?: string;
  required: boolean;
  needsReview: boolean;
  options: ParsedOption[];
};

export type ParsedDocument = {
  /** 문서에서 추정한 설문 제목 (없으면 파일명 기반) */
  title?: string;
  questions: ParsedQuestion[];
  warnings: string[];
  /** 파서가 추출한 원본 텍스트 라인 (디버깅/미리보기용) */
  rawLines: string[];
};

export interface SurveyDocumentParser {
  supports(file: UploadedFile): boolean;
  parse(file: UploadedFile): Promise<ParsedDocument>;
}

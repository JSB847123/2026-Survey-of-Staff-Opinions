import "server-only";
import { AppError } from "../errors";
import { HwpxSurveyParser } from "./hwpx";
import { DocxSurveyParser } from "./docx";
import { PdfSurveyParser } from "./pdf";
import type { ParsedDocument, SurveyDocumentParser, UploadedFile } from "./types";

export { validateUploadedFile } from "./validate";
export type { ParsedDocument, ParsedQuestion, UploadedFile } from "./types";

const parsers: SurveyDocumentParser[] = [
  HwpxSurveyParser,
  DocxSurveyParser,
  PdfSurveyParser,
];

export async function parseSurveyDocument(
  file: UploadedFile,
): Promise<ParsedDocument> {
  const parser = parsers.find((p) => p.supports(file));
  if (!parser) {
    throw new AppError(
      400,
      "지원하지 않는 파일 형식입니다. HWPX, DOCX, PDF 파일만 업로드할 수 있습니다.",
    );
  }
  return parser.parse(file);
}

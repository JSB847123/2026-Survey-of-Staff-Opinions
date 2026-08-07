import "server-only";
import { AppError } from "../errors";
import { UNSUPPORTED_FILE_MESSAGE } from "../constants";
import { HwpxSurveyParser } from "./hwpx";
import { DocxSurveyParser } from "./docx";
import { PdfSurveyParser } from "./pdf";
import { MarkdownSurveyParser } from "./markdown";
import type { ParsedDocument, SurveyDocumentParser, UploadedFile } from "./types";

export { validateUploadedFile } from "./validate";
export type { ParsedDocument, ParsedQuestion, UploadedFile } from "./types";

const parsers: SurveyDocumentParser[] = [
  HwpxSurveyParser,
  DocxSurveyParser,
  PdfSurveyParser,
  MarkdownSurveyParser,
];

export async function parseSurveyDocument(
  file: UploadedFile,
): Promise<ParsedDocument> {
  const parser = parsers.find((p) => p.supports(file));
  if (!parser) {
    throw new AppError(400, UNSUPPORTED_FILE_MESSAGE);
  }
  return parser.parse(file);
}

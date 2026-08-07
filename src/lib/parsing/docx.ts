import "server-only";
import mammoth from "mammoth";
import { ParseError } from "../errors";
import { getExtension } from "./validate";
import { extractSurveyStructure } from "./extract";
import type { ParsedDocument, SurveyDocumentParser, UploadedFile } from "./types";

export const DocxSurveyParser: SurveyDocumentParser = {
  supports(file: UploadedFile): boolean {
    return getExtension(file.name) === "docx";
  },

  async parse(file: UploadedFile): Promise<ParsedDocument> {
    let text: string;
    try {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      text = result.value;
    } catch {
      throw new ParseError("손상되었거나 올바르지 않은 DOCX 파일입니다.");
    }

    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      throw new ParseError("DOCX 문서에서 텍스트를 찾을 수 없습니다.");
    }

    return extractSurveyStructure(lines);
  },
};

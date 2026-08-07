import "server-only";
import { ParseError } from "../errors";
import { PDF_NO_TEXT_MESSAGE } from "../constants";
import { getExtension } from "./validate";
import { extractSurveyStructure } from "./extract";
import type { ParsedDocument, SurveyDocumentParser, UploadedFile } from "./types";

type TextItem = { str: string; transform: number[] };

/**
 * 같은 y 좌표(행)의 텍스트 조각을 묶어 라인으로 재구성한다.
 */
function itemsToLines(items: TextItem[]): string[] {
  const rows = new Map<number, { x: number; str: string }[]>();
  for (const item of items) {
    if (!item.str) continue;
    const y = Math.round(item.transform[5]);
    const x = item.transform[4];
    // 근접한 y(±2)는 같은 행으로 취급
    let key = y;
    for (const existing of rows.keys()) {
      if (Math.abs(existing - y) <= 2) {
        key = existing;
        break;
      }
    }
    const row = rows.get(key) ?? [];
    row.push({ x, str: item.str });
    rows.set(key, row);
  }

  return [...rows.entries()]
    .sort((a, b) => b[0] - a[0]) // PDF 좌표계: y가 클수록 위쪽
    .map(([, parts]) =>
      parts
        .sort((a, b) => a.x - b.x)
        .map((p) => p.str)
        .join(" ")
        .trim(),
    )
    .filter((line) => line.length > 0);
}

export const PdfSurveyParser: SurveyDocumentParser = {
  supports(file: UploadedFile): boolean {
    return getExtension(file.name) === "pdf";
  },

  async parse(file: UploadedFile): Promise<ParsedDocument> {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(file.buffer),
      useSystemFonts: true,
    });

    let doc;
    try {
      doc = await loadingTask.promise;
    } catch {
      throw new ParseError("손상되었거나 올바르지 않은 PDF 파일입니다.");
    }

    try {
      const lines: string[] = [];
      for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
        const page = await doc.getPage(pageNum);
        const content = await page.getTextContent();
        const items: TextItem[] = [];
        for (const item of content.items) {
          const candidate = item as Partial<TextItem>;
          if (
            typeof candidate.str === "string" &&
            Array.isArray(candidate.transform)
          ) {
            items.push({ str: candidate.str, transform: candidate.transform });
          }
        }
        lines.push(...itemsToLines(items));
      }

      if (lines.join("").trim().length === 0) {
        throw new ParseError(PDF_NO_TEXT_MESSAGE);
      }

      return extractSurveyStructure(lines);
    } finally {
      await loadingTask.destroy();
    }
  },
};

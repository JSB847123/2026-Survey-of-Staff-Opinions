import "server-only";
import { ParseError } from "../errors";
import { getExtension } from "./validate";
import { extractSurveyStructure } from "./extract";
import type { ParsedDocument, SurveyDocumentParser, UploadedFile } from "./types";

/**
 * Markdown 문법을 제거해 일반 텍스트 라인으로 변환한다.
 * - 제목(#), 인용(>), 목록 마커(-, *, +)
 * - 강조(**bold**, *italic*, `code`), 링크 [텍스트](url)
 * - GFM 체크박스 `- [ ]` / `- [x]` 는 체크박스 기호(□/☑)로 변환해
 *   기존 문항 추출기가 선택지로 인식하게 한다.
 * - 번호 목록("1. ")은 문항 번호일 수 있으므로 그대로 둔다.
 */
function markdownToLines(text: string): string[] {
  const lines: string[] = [];
  let inCodeFence = false;

  for (const rawLine of text.split(/\r?\n/)) {
    let line = rawLine.trim();

    // 코드 펜스 구간은 건너뛴다
    if (/^(```|~~~)/.test(line)) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;

    if (!line) continue;
    // 수평선, 표 구분선 제거
    if (/^([-*_]\s*){3,}$/.test(line)) continue;
    if (/^\|?[\s:|-]+\|[\s:|-]*$/.test(line) && line.includes("-")) continue;

    // 제목/인용 마커 제거
    line = line.replace(/^#{1,6}\s*/, "").replace(/^>\s*/, "");

    // GFM 체크박스 → 체크박스 기호
    const taskMatch = line.match(/^[-*+]\s+\[( |x|X)\]\s*(.*)$/);
    if (taskMatch) {
      const symbol = taskMatch[1].toLowerCase() === "x" ? "☑" : "□";
      line = `${symbol} ${taskMatch[2].trim()}`;
    } else {
      // 표 행은 셀 구분자를 공백으로
      if (line.startsWith("|")) {
        line = line.replace(/^\||\|$/g, "").replace(/\|/g, " ");
      }
      line = line.replace(/^[-*+]\s+/, "");
    }

    // 인라인 강조/코드/링크 정리
    line = line
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/(\*\*|__)(.*?)\1/g, "$2")
      .replace(/(\*|_)(.*?)\1/g, "$2")
      .replace(/`([^`]*)`/g, "$1")
      .replace(/~~(.*?)~~/g, "$1")
      .trim();

    if (line) lines.push(line);
  }

  return lines;
}

export const MarkdownSurveyParser: SurveyDocumentParser = {
  supports(file: UploadedFile): boolean {
    const ext = getExtension(file.name);
    return ext === "md" || ext === "markdown";
  },

  async parse(file: UploadedFile): Promise<ParsedDocument> {
    // NUL 바이트가 있으면 바이너리 파일로 판단한다.
    if (file.buffer.includes(0x00)) {
      throw new ParseError(
        "텍스트 파일이 아닌 것 같습니다. UTF-8 Markdown 파일을 업로드해 주세요.",
      );
    }

    // BOM 제거 후 디코딩
    let text = file.buffer.toString("utf8");
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

    const lines = markdownToLines(text);
    if (lines.length === 0) {
      throw new ParseError("Markdown 문서에서 텍스트를 찾을 수 없습니다.");
    }

    return extractSurveyStructure(lines);
  },
};

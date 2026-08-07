import "server-only";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import { ParseError } from "../errors";
import { getExtension } from "./validate";
import { extractSurveyStructure } from "./extract";
import type { ParsedDocument, SurveyDocumentParser, UploadedFile } from "./types";

const MAX_ENTRY_SIZE = 20 * 1024 * 1024; // zip bomb 방어: 압축 해제 후 개별 파일 최대 20MB
const MAX_TOTAL_SIZE = 50 * 1024 * 1024;

type OrderedNode = Record<string, unknown>;

const PARAGRAPH_TAGS = new Set(["hp:p", "p"]);
const TEXT_TAGS = new Set(["hp:t", "t"]);
const TABLE_TAGS = new Set(["hp:tbl", "tbl"]);
const CELL_TAGS = new Set(["hp:tc", "tc"]);
const SKIP_TAGS = new Set([":@", "#text"]);

/**
 * preserveOrder 모드의 fast-xml-parser 노드 트리를 순회하며
 * 문단/표(셀 단위) 텍스트를 문서 순서대로 lines에 추가한다.
 */
function walkNodes(nodes: OrderedNode[], lines: string[]): void {
  for (const node of nodes) {
    for (const [tag, value] of Object.entries(node)) {
      if (SKIP_TAGS.has(tag)) continue;
      const children = Array.isArray(value) ? (value as OrderedNode[]) : [];
      if (PARAGRAPH_TAGS.has(tag)) {
        emitParagraph(children, lines);
      } else if (TABLE_TAGS.has(tag)) {
        walkTable(children, lines);
      } else {
        walkNodes(children, lines);
      }
    }
  }
}

/** 문단: 내부 텍스트를 한 줄로 합치되, 문단 안에 표가 있으면 표는 별도 라인으로 처리 */
function emitParagraph(children: OrderedNode[], lines: string[]): void {
  const buf: string[] = [];
  const tables: OrderedNode[][] = [];
  collectParagraphText(children, buf, tables);
  const text = buf.join("").trim();
  if (text) lines.push(text);
  for (const tableChildren of tables) {
    walkTable(tableChildren, lines);
  }
}

function collectParagraphText(
  nodes: OrderedNode[],
  buf: string[],
  tables: OrderedNode[][],
): void {
  for (const node of nodes) {
    for (const [tag, value] of Object.entries(node)) {
      if (tag === "#text") {
        buf.push(String(value));
        continue;
      }
      if (tag === ":@") continue;
      const children = Array.isArray(value) ? (value as OrderedNode[]) : [];
      if (TABLE_TAGS.has(tag)) {
        tables.push(children);
      } else if (TEXT_TAGS.has(tag)) {
        collectParagraphText(children, buf, tables);
      } else {
        collectParagraphText(children, buf, tables);
      }
    }
  }
}

/** 표: 셀(hp:tc) 단위로 내부 문단들을 각각의 라인으로 추가 */
function walkTable(nodes: OrderedNode[], lines: string[]): void {
  for (const node of nodes) {
    for (const [tag, value] of Object.entries(node)) {
      if (SKIP_TAGS.has(tag)) continue;
      const children = Array.isArray(value) ? (value as OrderedNode[]) : [];
      if (CELL_TAGS.has(tag)) {
        walkNodes(children, lines);
      } else {
        walkTable(children, lines);
      }
    }
  }
}

async function loadZipSafely(buffer: Buffer): Promise<JSZip> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new ParseError("손상되었거나 올바르지 않은 HWPX 파일입니다.");
  }
  let total = 0;
  for (const entry of Object.values(zip.files)) {
    // @ts-expect-error 내부 데이터의 압축 해제 크기 확인 (jszip 내부 필드)
    const size: number | undefined = entry._data?.uncompressedSize;
    if (typeof size === "number") {
      if (size > MAX_ENTRY_SIZE) {
        throw new ParseError("비정상적으로 큰 압축 항목이 포함되어 있습니다.");
      }
      total += size;
      if (total > MAX_TOTAL_SIZE) {
        throw new ParseError("압축 해제 크기가 허용 범위를 초과했습니다.");
      }
    }
  }
  return zip;
}

export const HwpxSurveyParser: SurveyDocumentParser = {
  supports(file: UploadedFile): boolean {
    return getExtension(file.name) === "hwpx";
  },

  async parse(file: UploadedFile): Promise<ParsedDocument> {
    const zip = await loadZipSafely(file.buffer);

    const sectionNames = Object.keys(zip.files)
      .filter((name) => /^Contents\/section\d+\.xml$/i.test(name))
      .sort((a, b) => {
        const numA = Number(a.match(/section(\d+)/i)?.[1] ?? 0);
        const numB = Number(b.match(/section(\d+)/i)?.[1] ?? 0);
        return numA - numB;
      });

    if (sectionNames.length === 0) {
      throw new ParseError(
        "HWPX 본문(Contents/section*.xml)을 찾을 수 없습니다. 올바른 HWPX 파일인지 확인해 주세요.",
      );
    }

    const parser = new XMLParser({
      preserveOrder: true,
      ignoreAttributes: true,
      trimValues: false,
      processEntities: true,
    });

    const lines: string[] = [];
    for (const name of sectionNames) {
      const xmlText = await zip.files[name].async("string");
      let tree: OrderedNode[];
      try {
        tree = parser.parse(xmlText) as OrderedNode[];
      } catch {
        throw new ParseError("HWPX 내부 XML을 해석할 수 없습니다.");
      }
      walkNodes(tree, lines);
    }

    return extractSurveyStructure(lines);
  },
};

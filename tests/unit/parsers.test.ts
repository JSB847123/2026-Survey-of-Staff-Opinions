import { describe, expect, it } from "vitest";
import { HwpxSurveyParser } from "@/lib/parsing/hwpx";
import { DocxSurveyParser } from "@/lib/parsing/docx";
import { PdfSurveyParser } from "@/lib/parsing/pdf";
import { ParseError } from "@/lib/errors";
import { PDF_NO_TEXT_MESSAGE } from "@/lib/constants";
import type { UploadedFile } from "@/lib/parsing/types";
import {
  buildDocx,
  buildEmptyPdf,
  buildHwpx,
  buildPdf,
} from "../helpers/build-files";

function toUploadedFile(name: string, buffer: Buffer): UploadedFile {
  return { name, size: buffer.length, mimeType: "", buffer };
}

describe("HwpxSurveyParser", () => {
  it("HWPX ZIP/XML을 해석해 문항을 추출한다", async () => {
    const buffer = await buildHwpx([
      "2026 직원 의견 설문조사",
      "1. 근무환경에 만족하십니까?",
      "□ 매우 만족 □ 만족 □ 보통",
      "2. 개선사항을 자유롭게 작성해 주세요.",
    ]);
    const doc = await HwpxSurveyParser.parse(
      toUploadedFile("설문.hwpx", buffer),
    );
    expect(doc.questions).toHaveLength(2);
    expect(doc.questions[0].type).toBe("CHECKBOX");
    expect(doc.questions[0].options).toHaveLength(3);
    expect(doc.questions[1].type).toBe("LONG_TEXT");
  });

  it("손상된 ZIP은 ParseError를 던진다", async () => {
    await expect(
      HwpxSurveyParser.parse(
        toUploadedFile("broken.hwpx", Buffer.from("PK\x03\x04garbage")),
      ),
    ).rejects.toThrow(ParseError);
  });

  it("본문 section이 없으면 ParseError를 던진다", async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    zip.file("mimetype", "application/hwp+zip");
    const buffer = await zip.generateAsync({ type: "nodebuffer" });
    await expect(
      HwpxSurveyParser.parse(toUploadedFile("empty.hwpx", buffer)),
    ).rejects.toThrow(/본문/);
  });
});

describe("DocxSurveyParser", () => {
  it("DOCX 문단에서 문항을 추출한다", async () => {
    const buffer = await buildDocx([
      "부서 만족도 조사",
      "1. 소통이 원활합니까?",
      "□ 예",
      "□ 아니오",
      "2. 건의사항을 작성해 주세요.",
    ]);
    const doc = await DocxSurveyParser.parse(
      toUploadedFile("설문.docx", buffer),
    );
    expect(doc.title).toBe("부서 만족도 조사");
    expect(doc.questions).toHaveLength(2);
    expect(doc.questions[0].options.map((o) => o.label)).toEqual([
      "예",
      "아니오",
    ]);
  });

  it("손상된 DOCX는 ParseError를 던진다", async () => {
    await expect(
      DocxSurveyParser.parse(
        toUploadedFile("broken.docx", Buffer.from("not a zip")),
      ),
    ).rejects.toThrow(ParseError);
  });
});

describe("PdfSurveyParser", () => {
  it("텍스트 PDF에서 내용을 추출한다", async () => {
    const buffer = buildPdf("1. Are you satisfied with your work?");
    const doc = await PdfSurveyParser.parse(toUploadedFile("survey.pdf", buffer));
    expect(doc.questions).toHaveLength(1);
    expect(doc.questions[0].title).toContain("satisfied");
  });

  it("텍스트가 없는 PDF는 지정된 안내 메시지로 거부한다", async () => {
    const buffer = buildEmptyPdf();
    await expect(
      PdfSurveyParser.parse(toUploadedFile("scan.pdf", buffer)),
    ).rejects.toThrow(PDF_NO_TEXT_MESSAGE);
  });

  it("손상된 PDF는 ParseError를 던진다", async () => {
    await expect(
      PdfSurveyParser.parse(
        toUploadedFile("broken.pdf", Buffer.from("%PDF-1.4 garbage")),
      ),
    ).rejects.toThrow(ParseError);
  });
});

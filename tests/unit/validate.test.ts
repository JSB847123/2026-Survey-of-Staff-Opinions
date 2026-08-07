import { describe, expect, it } from "vitest";
import { validateUploadedFile } from "@/lib/parsing/validate";
import { AppError } from "@/lib/errors";
import {
  FILE_TOO_LARGE_MESSAGE,
  MAX_FILE_SIZE,
} from "@/lib/constants";
import type { UploadedFile } from "@/lib/parsing/types";

const ZIP_HEAD = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const PDF_HEAD = Buffer.from("%PDF-1.4\n");

function makeFile(overrides: Partial<UploadedFile>): UploadedFile {
  const buffer = overrides.buffer ?? Buffer.concat([ZIP_HEAD, Buffer.alloc(16)]);
  return {
    name: overrides.name ?? "설문.docx",
    mimeType:
      overrides.mimeType ??
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    buffer,
    size: overrides.size ?? buffer.length,
  };
}

describe("validateUploadedFile", () => {
  it("500KB 이하 파일은 통과한다", () => {
    const buffer = Buffer.concat([ZIP_HEAD, Buffer.alloc(1024)]);
    expect(validateUploadedFile(makeFile({ buffer }))).toBe("docx");
  });

  it("정확히 500KB(500*1024 bytes) 파일은 통과한다", () => {
    const buffer = Buffer.concat([
      ZIP_HEAD,
      Buffer.alloc(MAX_FILE_SIZE - ZIP_HEAD.length),
    ]);
    expect(buffer.length).toBe(MAX_FILE_SIZE);
    expect(validateUploadedFile(makeFile({ buffer }))).toBe("docx");
  });

  it("500KB 초과 파일은 지정된 메시지로 거부한다", () => {
    const buffer = Buffer.concat([ZIP_HEAD, Buffer.alloc(MAX_FILE_SIZE)]);
    try {
      validateUploadedFile(makeFile({ buffer }));
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).message).toBe(FILE_TOO_LARGE_MESSAGE);
      expect((error as AppError).status).toBe(413);
    }
  });

  it("지원하지 않는 확장자는 거부한다", () => {
    expect(() =>
      validateUploadedFile(makeFile({ name: "설문.hwp" })),
    ).toThrow(/지원하지 않는 파일 형식/);
    expect(() =>
      validateUploadedFile(makeFile({ name: "malware.exe" })),
    ).toThrow(/지원하지 않는 파일 형식/);
  });

  it("MIME type이 확장자와 일치하지 않으면 거부한다", () => {
    expect(() =>
      validateUploadedFile(makeFile({ mimeType: "text/html" })),
    ).toThrow(/MIME type/);
  });

  it("PDF signature가 없는 .pdf는 거부한다", () => {
    expect(() =>
      validateUploadedFile(
        makeFile({
          name: "가짜.pdf",
          mimeType: "application/pdf",
          buffer: Buffer.from("not a pdf at all"),
        }),
      ),
    ).toThrow(/올바른 PDF 파일이 아닙니다/);
  });

  it("ZIP signature가 없는 .hwpx는 거부한다", () => {
    expect(() =>
      validateUploadedFile(
        makeFile({
          name: "가짜.hwpx",
          mimeType: "application/haansofthwpx",
          buffer: Buffer.from("plain text"),
        }),
      ),
    ).toThrow(/올바른 HWPX 파일이 아닙니다/);
  });

  it("올바른 PDF signature는 통과한다", () => {
    const buffer = Buffer.concat([PDF_HEAD, Buffer.alloc(64)]);
    expect(
      validateUploadedFile(
        makeFile({ name: "설문.pdf", mimeType: "application/pdf", buffer }),
      ),
    ).toBe("pdf");
  });

  it("빈 파일은 거부한다", () => {
    expect(() =>
      validateUploadedFile(makeFile({ buffer: Buffer.alloc(0) })),
    ).toThrow(/빈 파일/);
  });
});

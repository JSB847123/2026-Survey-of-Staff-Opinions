import "server-only";
import { AppError } from "../errors";
import {
  FILE_TOO_LARGE_MESSAGE,
  MAX_FILE_SIZE,
  SUPPORTED_EXTENSIONS,
  UNSUPPORTED_FILE_MESSAGE,
  type SupportedExtension,
} from "../constants";
import type { UploadedFile } from "./types";

const ZIP_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // PK\x03\x04
const PDF_SIGNATURE = Buffer.from("%PDF-");

const ALLOWED_MIME_TYPES: Record<SupportedExtension, string[]> = {
  hwpx: [
    "application/haansofthwpx",
    "application/x-hwpx",
    "application/zip",
    "application/octet-stream",
    "",
  ],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip",
    "application/octet-stream",
    "",
  ],
  pdf: ["application/pdf", "application/octet-stream", ""],
  md: [
    "text/markdown",
    "text/x-markdown",
    "text/plain",
    "application/octet-stream",
    "",
  ],
  markdown: [
    "text/markdown",
    "text/x-markdown",
    "text/plain",
    "application/octet-stream",
    "",
  ],
};

export function getExtension(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  return idx >= 0 ? fileName.slice(idx + 1).toLowerCase() : "";
}

/**
 * 크기 / 확장자 / MIME type / file signature 검증.
 * 통과하면 정규화된 확장자를 반환한다.
 */
export function validateUploadedFile(file: UploadedFile): SupportedExtension {
  if (file.size > MAX_FILE_SIZE || file.buffer.length > MAX_FILE_SIZE) {
    throw new AppError(413, FILE_TOO_LARGE_MESSAGE);
  }
  if (file.buffer.length === 0) {
    throw new AppError(400, "빈 파일은 업로드할 수 없습니다.");
  }

  const ext = getExtension(file.name);
  if (!(SUPPORTED_EXTENSIONS as readonly string[]).includes(ext)) {
    throw new AppError(400, UNSUPPORTED_FILE_MESSAGE);
  }
  const extension = ext as SupportedExtension;

  const mime = (file.mimeType ?? "").toLowerCase().split(";")[0].trim();
  if (!ALLOWED_MIME_TYPES[extension].includes(mime)) {
    throw new AppError(
      400,
      "파일 형식(MIME type)이 확장자와 일치하지 않습니다.",
    );
  }

  const head = file.buffer.subarray(0, 8);
  if (extension === "pdf") {
    if (!head.subarray(0, PDF_SIGNATURE.length).equals(PDF_SIGNATURE)) {
      throw new AppError(400, "올바른 PDF 파일이 아닙니다.");
    }
  } else if (extension === "md" || extension === "markdown") {
    // 텍스트 파일은 시그니처가 없으므로 바이너리 여부만 확인한다.
    if (file.buffer.includes(0x00)) {
      throw new AppError(
        400,
        "올바른 Markdown 파일이 아닙니다. UTF-8 텍스트 파일을 업로드해 주세요.",
      );
    }
  } else {
    // hwpx, docx는 모두 ZIP 컨테이너
    if (!head.subarray(0, ZIP_SIGNATURE.length).equals(ZIP_SIGNATURE)) {
      throw new AppError(
        400,
        `올바른 ${extension.toUpperCase()} 파일이 아닙니다.`,
      );
    }
  }

  return extension;
}

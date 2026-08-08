/** 최대 인원 기본값 (운영자가 1~20 사이로 조정 가능) */
export const DEFAULT_MAX_RESPONDENTS = 13;

/** 운영자가 설정할 수 있는 최대 인원 범위 */
export const MIN_RESPONDENT_LIMIT = 1;
export const MAX_RESPONDENT_LIMIT = 20;

export function accountLimitMessage(limit: number): string {
  return `응답자 계정은 최대 ${limit}개까지 만들 수 있습니다.`;
}

// 500KB = 500 * 1024 bytes
export const MAX_FILE_SIZE = 500 * 1024;

export const FILE_TOO_LARGE_MESSAGE =
  "파일 크기는 최대 500KB까지 업로드할 수 있습니다.";

export const PDF_NO_TEXT_MESSAGE =
  "이 PDF에서는 텍스트를 추출할 수 없습니다. HWPX, DOCX 또는 텍스트 PDF를 업로드해 주세요.";

export const ALREADY_SUBMITTED_MESSAGE = "이미 설문 응답을 완료했습니다.";

export const SUPPORTED_EXTENSIONS = [
  "hwpx",
  "docx",
  "pdf",
  "md",
  "markdown",
] as const;
export type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];

/** 사용자에게 보여줄 지원 형식 표기 */
export const SUPPORTED_FORMATS_LABEL = "HWPX, DOCX, PDF, Markdown(.md)";

export const UNSUPPORTED_FILE_MESSAGE = `지원하지 않는 파일 형식입니다. ${SUPPORTED_FORMATS_LABEL} 파일만 업로드할 수 있습니다.`;

export const CHECKBOX_CHARS = ["□", "☐", "☑", "■", "▢"] as const;

/**
 * 운영자와 응답자는 서로 다른 쿠키를 사용한다.
 * (같은 쿠키를 공유하면 한 브라우저에서 응답자 화면을 확인하는 순간
 *  운영자 세션이 덮어써져 다시 로그인해야 하는 문제가 생긴다.)
 */
export const STAFF_SESSION_COOKIE = "staff_session";
export const RESPONDENT_SESSION_COOKIE = "respondent_session";

/** 역할 분리 이전에 쓰던 쿠키 — 남아 있으면 정리한다. */
export const LEGACY_SESSION_COOKIE = "survey_session";

export const STAFF_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8시간
export const RESPONDENT_SESSION_MAX_AGE_SECONDS = 60 * 60 * 2; // 2시간

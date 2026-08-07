export const MAX_RESPONDENTS_PER_SURVEY = 13;

// 500KB = 500 * 1024 bytes
export const MAX_FILE_SIZE = 500 * 1024;

export const FILE_TOO_LARGE_MESSAGE =
  "파일 크기는 최대 500KB까지 업로드할 수 있습니다.";

export const PDF_NO_TEXT_MESSAGE =
  "이 PDF에서는 텍스트를 추출할 수 없습니다. HWPX, DOCX 또는 텍스트 PDF를 업로드해 주세요.";

export const ALREADY_SUBMITTED_MESSAGE = "이미 설문 응답을 완료했습니다.";

export const SUPPORTED_EXTENSIONS = ["hwpx", "docx", "pdf"] as const;
export type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];

export const CHECKBOX_CHARS = ["□", "☐", "☑", "■", "▢"] as const;

export const SESSION_COOKIE_NAME = "survey_session";

export const STAFF_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8시간
export const RESPONDENT_SESSION_MAX_AGE_SECONDS = 60 * 60 * 2; // 2시간

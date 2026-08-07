import type { QuestionType } from "@prisma/client";
import { CHECKBOX_CHARS } from "../constants";
import type { ParsedDocument, ParsedOption, ParsedQuestion } from "./types";

/** "1." / "1)" / "1-1." / "문1." / "문 1." 형태의 문제번호 */
const QUESTION_PATTERN = /^(?:문\s?)?(\d+(?:-\d+)?)\s*[.)]\s*(.+)$/;

const CHECKBOX_REGEX = new RegExp(`[${CHECKBOX_CHARS.join("")}]`);
const CHECKBOX_SPLIT_REGEX = new RegExp(`[${CHECKBOX_CHARS.join("")}]`, "g");

const LONG_TEXT_KEYWORDS = [
  "기타 의견",
  "기타의견",
  "건의사항",
  "개선사항",
  "자유롭게 작성",
  "의견을 작성",
  "서술해 주",
  "자유 기재",
];

/** 밑줄이나 빈 괄호가 있으면 단답형 후보로 본다 */
const SHORT_TEXT_PATTERN = /_{3,}|\(\s{2,}\)/;

function isLongTextCandidate(text: string): boolean {
  return LONG_TEXT_KEYWORDS.some((k) => text.includes(k));
}

type WorkingQuestion = {
  number: string;
  title: string;
  descriptionLines: string[];
  options: ParsedOption[];
};

function finalizeQuestion(
  wq: WorkingQuestion,
  order: number,
  warnings: string[],
): ParsedQuestion {
  const description = wq.descriptionLines.join("\n").trim() || undefined;
  const combined = `${wq.title} ${description ?? ""}`;

  let type: QuestionType;
  let needsReview = false;

  if (wq.options.length > 0) {
    type = "CHECKBOX";
    if (wq.options.length === 1) {
      needsReview = true;
      warnings.push(
        `문항 ${wq.number}: 선택지가 1개만 인식되었습니다. 확인이 필요합니다.`,
      );
    }
  } else if (isLongTextCandidate(combined)) {
    type = "LONG_TEXT";
  } else if (SHORT_TEXT_PATTERN.test(combined)) {
    type = "SHORT_TEXT";
  } else {
    // 선택지도 주관식 단서도 없으면 임의로 만들지 않고 확인 필요로 표시
    type = "LONG_TEXT";
    needsReview = true;
    warnings.push(
      `문항 ${wq.number}: 유형을 확정할 수 없어 '확인 필요' 상태로 표시했습니다.`,
    );
  }

  return {
    order,
    type,
    title: wq.title.trim(),
    description,
    required: false,
    needsReview,
    options: wq.options,
  };
}

function extractOptionsFromLine(line: string): string[] {
  return line
    .split(CHECKBOX_SPLIT_REGEX)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * 파서가 추출한 텍스트 라인들에서 설문 구조(문항/선택지)를 추출한다.
 * 구조가 불확실한 경우 내용을 만들어내지 않고 warning + needsReview로 표시한다.
 */
export function extractSurveyStructure(rawLines: string[]): ParsedDocument {
  const lines = rawLines.map((l) => l.replace(/\s+/g, " ").trim());
  const warnings: string[] = [];
  const questions: ParsedQuestion[] = [];

  let title: string | undefined;
  let current: WorkingQuestion | null = null;
  let order = 0;

  const pushCurrent = () => {
    if (current) {
      order += 1;
      questions.push(finalizeQuestion(current, order, warnings));
      current = null;
    }
  };

  for (const line of lines) {
    if (!line) continue;

    const questionMatch = line.match(QUESTION_PATTERN);
    // 체크박스 기호가 포함된 라인은 선택지로 우선 처리 ("1. □ 만족" 같은 형태 제외)
    if (questionMatch && !CHECKBOX_REGEX.test(questionMatch[2].charAt(0))) {
      pushCurrent();
      current = {
        number: questionMatch[1],
        title: questionMatch[2].trim(),
        descriptionLines: [],
        options: [],
      };
      // 제목 라인 뒤쪽에 체크박스 선택지가 붙어 있는 경우 분리
      const inlineCheckboxIdx = current.title.search(CHECKBOX_REGEX);
      if (inlineCheckboxIdx >= 0) {
        const optionPart = current.title.slice(inlineCheckboxIdx);
        current.title = current.title.slice(0, inlineCheckboxIdx).trim();
        for (const label of extractOptionsFromLine(optionPart)) {
          current.options.push({ order: current.options.length + 1, label });
        }
      }
      continue;
    }

    if (CHECKBOX_REGEX.test(line)) {
      if (!current) {
        warnings.push(
          `문항 번호 없이 선택지로 보이는 내용이 있습니다: "${line.slice(0, 40)}"`,
        );
        continue;
      }
      for (const label of extractOptionsFromLine(line)) {
        current.options.push({ order: current.options.length + 1, label });
      }
      continue;
    }

    if (current) {
      current.descriptionLines.push(line);
    } else if (!title) {
      title = line;
    }
  }
  pushCurrent();

  if (questions.length === 0) {
    warnings.push(
      "문서에서 설문 문항을 찾지 못했습니다. 편집 화면에서 직접 문항을 추가해 주세요.",
    );
  }

  return { title, questions, warnings, rawLines };
}

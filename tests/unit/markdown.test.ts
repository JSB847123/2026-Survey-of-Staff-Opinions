import { describe, expect, it } from "vitest";
import { MarkdownSurveyParser } from "@/lib/parsing/markdown";
import { validateUploadedFile } from "@/lib/parsing/validate";
import { ParseError } from "@/lib/errors";
import type { UploadedFile } from "@/lib/parsing/types";

function mdFile(content: string, name = "설문.md"): UploadedFile {
  const buffer = Buffer.from(content, "utf8");
  return { name, size: buffer.length, mimeType: "text/markdown", buffer };
}

describe("MarkdownSurveyParser", () => {
  it("제목과 체크박스 기호로 된 문항을 추출한다", async () => {
    const doc = await MarkdownSurveyParser.parse(
      mdFile(
        [
          "# 2026 직원 의견 설문조사",
          "",
          "1. 근무환경에 만족하십니까?",
          "",
          "□ 매우 만족",
          "□ 만족",
          "□ 보통",
          "",
          "2. 개선사항을 자유롭게 작성해 주세요.",
        ].join("\n"),
      ),
    );

    expect(doc.title).toBe("2026 직원 의견 설문조사");
    expect(doc.questions).toHaveLength(2);
    expect(doc.questions[0].type).toBe("CHECKBOX");
    expect(doc.questions[0].options.map((o) => o.label)).toEqual([
      "매우 만족",
      "만족",
      "보통",
    ]);
    expect(doc.questions[1].type).toBe("LONG_TEXT");
  });

  it("GFM 체크박스(- [ ])를 선택지로 인식한다", async () => {
    const doc = await MarkdownSurveyParser.parse(
      mdFile(
        [
          "## 부서 만족도",
          "1. 소통이 원활합니까?",
          "- [ ] 예",
          "- [x] 아니오",
        ].join("\n"),
      ),
    );

    expect(doc.questions).toHaveLength(1);
    expect(doc.questions[0].type).toBe("CHECKBOX");
    expect(doc.questions[0].options.map((o) => o.label)).toEqual([
      "예",
      "아니오",
    ]);
  });

  it("강조·링크·코드 등 마크다운 문법을 제거한다", async () => {
    const doc = await MarkdownSurveyParser.parse(
      mdFile(
        [
          "# 설문",
          "1. **근무환경**에 _만족_ 하십니까? [안내](https://example.com)",
          "□ 예",
          "□ 아니오",
        ].join("\n"),
      ),
    );

    expect(doc.questions[0].title).toBe("근무환경에 만족 하십니까? 안내");
  });

  it("코드 블록 내용은 무시한다", async () => {
    const doc = await MarkdownSurveyParser.parse(
      mdFile(
        [
          "# 설문",
          "```",
          "1. 이건 코드 안의 문항입니다",
          "□ 무시됨",
          "```",
          "1. 실제 문항입니다",
          "□ 예",
          "□ 아니오",
        ].join("\n"),
      ),
    );

    expect(doc.questions).toHaveLength(1);
    expect(doc.questions[0].title).toBe("실제 문항입니다");
  });

  it("빈 문서는 ParseError를 던진다", async () => {
    await expect(
      MarkdownSurveyParser.parse(mdFile("   \n\n   ")),
    ).rejects.toThrow(ParseError);
  });

  it(".md와 .markdown 확장자를 모두 지원한다", () => {
    expect(MarkdownSurveyParser.supports(mdFile("# a", "a.md"))).toBe(true);
    expect(MarkdownSurveyParser.supports(mdFile("# a", "a.markdown"))).toBe(
      true,
    );
    expect(MarkdownSurveyParser.supports(mdFile("# a", "a.docx"))).toBe(false);
  });
});

describe("Markdown 업로드 검증", () => {
  it("text/markdown, text/plain MIME을 허용한다", () => {
    const buffer = Buffer.from("# 설문", "utf8");
    expect(
      validateUploadedFile({
        name: "설문.md",
        size: buffer.length,
        mimeType: "text/markdown",
        buffer,
      }),
    ).toBe("md");
    expect(
      validateUploadedFile({
        name: "설문.md",
        size: buffer.length,
        mimeType: "text/plain",
        buffer,
      }),
    ).toBe("md");
  });

  it("NUL 바이트가 포함된 파일은 거부한다", () => {
    const buffer = Buffer.from([0x23, 0x20, 0x00, 0x41]);
    expect(() =>
      validateUploadedFile({
        name: "가짜.md",
        size: buffer.length,
        mimeType: "text/markdown",
        buffer,
      }),
    ).toThrow(/올바른 Markdown 파일이 아닙니다/);
  });
});

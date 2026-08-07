import { test, expect, type Page } from "@playwright/test";
import { buildDocx } from "../tests/helpers/build-files";

/**
 * E2E 시나리오:
 * 1. 관리자 로그인 → 설문 업로드(자동 변환) → 편집/저장 → 게시 → 응답자 계정 생성
 * 2. 응답자 로그인 → 응답 작성 → 제출 → 재접속 시 중복 차단
 * 3. 확인자 로그인 → 응답 현황 확인 → AI 분석 페이지 접근 → 관리자 설정 접근 차단
 *
 * Access Code는 하드코딩하지 않고 환경변수에서 읽는다.
 */
const ADMIN_CODE = process.env.ADMIN_ACCESS_CODE ?? "";
const REVIEWER_CODE = process.env.REVIEWER_ACCESS_CODE ?? "";

const RESPONDENT_ID = "0012";
const RESPONDENT_PW = "3456";

let surveyUrl = ""; // /staff/surveys/[id]
let respondentUrl = ""; // /s/[slug]

async function staffLogin(page: Page, code: string) {
  await page.goto("/staff/login");
  await page.getByLabel("Access Code").fill(code);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL("**/staff");
}

async function staffLogout(page: Page) {
  await page
    .getByRole("button", { name: "로그아웃" })
    .first()
    .click();
  await page.waitForURL("**/staff/login");
}

test.describe.serial("설문 전체 흐름", () => {
  test.beforeAll(() => {
    expect(ADMIN_CODE, "ADMIN_ACCESS_CODE 환경변수가 필요합니다").toBeTruthy();
    expect(
      REVIEWER_CODE,
      "REVIEWER_ACCESS_CODE 환경변수가 필요합니다",
    ).toBeTruthy();
  });

  test("관리자: 로그인 → 설문 업로드 → 게시 → 응답자 계정 생성", async ({
    page,
  }) => {
    await staffLogin(page, ADMIN_CODE);
    await expect(page.getByText("설문 목록").first()).toBeVisible();

    // 설문 파일 업로드
    await page.goto("/staff/surveys/new");
    const docx = await buildDocx([
      "E2E 테스트 설문조사",
      "1. 근무환경에 만족하십니까?",
      "□ 매우 만족 □ 만족 □ 보통 □ 불만족 □ 매우 불만족",
      "2. 개선사항을 자유롭게 작성해 주세요.",
    ]);
    await page.locator('input[type="file"]').setInputFiles({
      name: "e2e-survey.docx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      buffer: docx,
    });
    await page.getByRole("button", { name: "업로드 및 문항 추출" }).click();

    // 편집 화면으로 이동됨
    await page.waitForURL("**/staff/surveys/*/edit", { timeout: 30_000 });
    await expect(page.getByText("문항 1")).toBeVisible();
    await expect(page.locator('input[id^="q-title-"]').first()).toHaveValue(
      "근무환경에 만족하십니까?",
    );

    // 저장 → 설문 현황으로 이동
    await page.getByRole("button", { name: "저장" }).first().click();
    await page.waitForURL(/\/staff\/surveys\/[^/]+$/);
    surveyUrl = new URL(page.url()).pathname;

    // 응답자 링크 확보
    const linkInput = page.getByLabel("설문 링크");
    const url = await linkInput.inputValue();
    respondentUrl = new URL(url).pathname;
    expect(respondentUrl).toMatch(/^\/s\//);

    // 게시
    await page.getByRole("button", { name: "게시", exact: true }).click();
    await expect(page.getByText("설문을 게시했습니다.")).toBeVisible();

    // 응답자 계정 생성
    await page.goto(`${surveyUrl}/respondents`);
    await page.getByLabel("ID", { exact: true }).fill(RESPONDENT_ID);
    await page.getByLabel("비밀번호", { exact: true }).fill(RESPONDENT_PW);
    await page.getByRole("button", { name: "계정 추가" }).click();
    await expect(
      page.getByRole("cell", { name: RESPONDENT_ID, exact: true }),
    ).toBeVisible();
    await expect(page.getByText("미제출")).toBeVisible();

    await staffLogout(page);
  });

  test("응답자: 로그인 → 응답 → 제출 → 재접속 시 중복 차단", async ({
    browser,
  }) => {
    expect(respondentUrl).toBeTruthy();
    const context = await browser.newContext();
    const page = await context.newPage();

    // 로그인
    await page.goto(respondentUrl);
    await page.getByLabel("ID (숫자 4자리)").fill(RESPONDENT_ID);
    await page.getByLabel("비밀번호 (숫자 4자리)").fill(RESPONDENT_PW);
    await page.getByRole("button", { name: "로그인" }).click();

    // 설문 화면
    await expect(
      page.getByText("근무환경에 만족하십니까?"),
    ).toBeVisible({ timeout: 15_000 });

    // 응답 작성
    await page.getByText("만족", { exact: true }).click();
    await page
      .getByLabel("2번 문항 답변")
      .fill("휴게 공간이 더 있으면 좋겠습니다.");

    // 제출 → 확인 dialog
    await page.getByRole("button", { name: "제출하기" }).click();
    await expect(
      page.getByText("응답을 제출하면 수정할 수 없습니다. 제출하시겠습니까?"),
    ).toBeVisible();
    await page.getByRole("button", { name: "제출", exact: true }).click();

    // 완료 화면
    await page.waitForURL("**/done");
    await expect(
      page.getByText("응답이 정상적으로 제출되었습니다."),
    ).toBeVisible();
    await expect(
      page.getByText("설문에 참여해 주셔서 감사합니다."),
    ).toBeVisible();

    // 재접속 → 중복 차단
    await page.goto(respondentUrl);
    await expect(
      page.getByText("이미 설문 응답을 완료했습니다."),
    ).toBeVisible();

    await context.close();
  });

  test("확인자: 응답 현황 → AI 분석 접근 가능, 관리자 설정 접근 불가", async ({
    page,
  }) => {
    expect(surveyUrl).toBeTruthy();
    await staffLogin(page, REVIEWER_CODE);

    // 확인자 배지 표시
    await expect(page.getByText("확인자").first()).toBeVisible();

    // 응답 현황 (1명 제출됨)
    await page.goto(surveyUrl);
    await expect(page.getByText("문항별 응답 통계")).toBeVisible();
    await expect(page.getByText("1명 (100%)").first()).toBeVisible();

    // AI 분석 페이지 접근 가능
    await page.goto(`${surveyUrl}/analysis`);
    await expect(page.getByText("AI 설문 분석")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "GPT-5.6 Luna로 분석" }),
    ).toBeVisible();

    // 설문 편집 접근 가능
    await page.goto(`${surveyUrl}/edit`);
    await expect(page.getByText("설문 편집").first()).toBeVisible();

    // 관리자 전용 설정 화면은 리다이렉트된다
    await page.goto("/staff/settings");
    await page.waitForURL("**/staff");
    expect(new URL(page.url()).pathname).toBe("/staff");

    // 관리자 전용 API도 서버에서 차단된다
    const res = await page.request.get("/api/audit");
    expect(res.status()).toBe(403);
  });

  test("정리: 관리자가 테스트 설문 삭제", async ({ page }) => {
    await staffLogin(page, ADMIN_CODE);
    await page.goto(surveyUrl);
    await page.getByRole("button", { name: "설문 삭제" }).click();
    await page.getByRole("button", { name: "삭제", exact: true }).click();
    await page.waitForURL("**/staff");
  });
});

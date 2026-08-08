import { test, expect, type Page } from "@playwright/test";
import { PrismaClient, type Prisma } from "@prisma/client";
import { buildDocx } from "../tests/helpers/build-files";

/**
 * AI를 실제로 호출하지 않고 분석 기록이 있는 상태를 만든다.
 * (초기화 UI 검증용)
 */
async function seedAnalyses(surveyId: string) {
  const prisma = new PrismaClient();
  const resultJson = {
    overallTrend: "E2E 테스트용 분석 결과",
    positives: [],
    improvements: [],
    keyChoiceFindings: [],
    recurringThemes: [],
    alignmentAndConflicts: [],
    organizationalSignals: [],
    actionableRecommendations: [],
    interpretationCautions: [],
  } as unknown as Prisma.InputJsonValue;

  try {
    await prisma.analysis.createMany({
      data: [
        {
          surveyId,
          provider: "openai",
          model: "gpt-5.6-luna",
          resultJson,
          resultMarkdown: "## E2E",
          responseCount: 1,
          surveyVersion: 1,
          createdByRole: "admin",
        },
        {
          surveyId,
          provider: "deepseek",
          model: "deepseek-v4-flash",
          resultJson,
          resultMarkdown: "## E2E",
          responseCount: 1,
          surveyVersion: 1,
          createdByRole: "admin",
        },
      ],
    });
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * E2E 시나리오:
 * 1. 관리자(역할 선택 로그인) → 설문 업로드(자동 변환) → 저장 → 게시
 * 2. 응답자 회원 가입(숫자 4자리 ID/PW) → 설문 목록 → 응답 → 제출 → 중복 차단
 * 3. 확인자 로그인 → 응답 현황 → AI 분석 접근 → 관리자 설정 접근 차단
 * 4. 정리(설문·계정 삭제)
 *
 * Access Code는 하드코딩하지 않고 환경변수에서 읽는다.
 */
const ADMIN_CODE = process.env.ADMIN_ACCESS_CODE ?? "";
const REVIEWER_CODE = process.env.REVIEWER_ACCESS_CODE ?? "";

const RESPONDENT_ID = "0012";
const RESPONDENT_PW = "3456";

let surveyUrl = ""; // /staff/surveys/[id]
let respondentUrl = ""; // /s/[slug]

async function staffLogin(page: Page, role: "admin" | "reviewer", code: string) {
  await page.goto("/staff/login");
  await page
    .getByRole("button", {
      name: role === "admin" ? "관리자 로그인" : "확인자 로그인",
    })
    .click();
  await page.getByLabel("Access Code").fill(code);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await page.waitForURL("**/staff");
}

async function staffLogout(page: Page) {
  await page.getByRole("button", { name: "로그아웃" }).first().click();
  await page.waitForURL("**/staff/login");
}

/** 이전 실행이 남긴 테스트 계정을 정리 */
async function deleteRespondentAccount(page: Page, loginId: string) {
  const res = await page.request.get("/api/respondents");
  if (!res.ok()) return;
  const data = (await res.json()) as {
    accounts: { id: string; loginId: string }[];
  };
  const target = data.accounts.find((a) => a.loginId === loginId);
  if (target) {
    await page.request.delete(`/api/respondents/${target.id}`);
  }
}

/** 이전 실행이 남긴 테스트 설문을 정리 */
async function deleteTestSurveys(page: Page, title: string) {
  const res = await page.request.get("/api/surveys");
  if (!res.ok()) return;
  const data = (await res.json()) as {
    surveys: { id: string; title: string }[];
  };
  for (const survey of data.surveys.filter((s) => s.title === title)) {
    await page.request.delete(`/api/surveys/${survey.id}`);
  }
}

test.describe.serial("설문 전체 흐름", () => {
  test.beforeAll(() => {
    expect(ADMIN_CODE, "ADMIN_ACCESS_CODE 환경변수가 필요합니다").toBeTruthy();
    expect(
      REVIEWER_CODE,
      "REVIEWER_ACCESS_CODE 환경변수가 필요합니다",
    ).toBeTruthy();
  });

  test("관리자: 역할 선택 로그인 → 설문 업로드 → 게시", async ({ page }) => {
    await staffLogin(page, "admin", ADMIN_CODE);
    await expect(page.getByText("설문 목록").first()).toBeVisible();

    // 이전 실행 잔여 데이터 정리 및 설정 초기화
    await deleteRespondentAccount(page, RESPONDENT_ID);
    await deleteTestSurveys(page, "E2E 테스트 설문조사");
    await deleteTestSurveys(page, "E2E 마크다운 설문");
    await page.request.patch("/api/settings", {
      data: { maxRespondents: 13 },
    });

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

    await staffLogout(page);
  });

  test("응답자: 회원 가입 → 설문 목록 → 응답 → 제출 → 중복 차단", async ({
    browser,
  }) => {
    expect(respondentUrl).toBeTruthy();
    const context = await browser.newContext();
    const page = await context.newPage();

    // 랜딩 → 설문 응답 → 회원 가입/로그인 선택 화면
    await page.goto("/");
    await page.getByRole("button", { name: "설문 응답 시작" }).click();
    await page.waitForURL("**/respondent");
    await expect(
      page.getByRole("button", { name: "회원 가입" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "로그인" })).toBeVisible();

    // 회원 가입 (숫자 4자리 ID/PW)
    await page.getByRole("button", { name: "회원 가입" }).click();
    await page.waitForURL("**/respondent/signup");
    await page.getByLabel("아이디 (숫자 4자리)").fill(RESPONDENT_ID);
    await page.getByLabel("비밀번호 (숫자 4자리)").fill(RESPONDENT_PW);
    await page.getByRole("button", { name: "회원 가입" }).click();

    // 가입 후 설문 목록으로 이동
    await page.waitForURL("**/respondent/surveys");
    await expect(
      page.getByRole("heading", { name: "진행 중인 설문" }),
    ).toBeVisible();
    await expect(
      page.locator('[data-slot="card-title"]', {
        hasText: "E2E 테스트 설문조사",
      }),
    ).toBeVisible();

    // 설문 참여
    await page.getByRole("button", { name: "설문 참여하기" }).first().click();
    await expect(page.getByText("근무환경에 만족하십니까?")).toBeVisible({
      timeout: 15_000,
    });

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

    // 설문 목록에서도 제출 완료로 표시
    await page.goto("/respondent/surveys");
    await expect(page.getByText("제출 완료").first()).toBeVisible();

    // 로그아웃 후 재로그인도 정상 동작
    await page.getByRole("button", { name: "로그아웃" }).click();
    await page.waitForURL("**/respondent");
    await page.getByRole("button", { name: "로그인" }).click();
    await page.getByLabel("아이디 (숫자 4자리)").fill(RESPONDENT_ID);
    await page.getByLabel("비밀번호 (숫자 4자리)").fill(RESPONDENT_PW);
    await page.getByRole("button", { name: "로그인", exact: true }).click();
    await page.waitForURL("**/respondent/surveys");

    await context.close();
  });

  test("확인자: 응답 현황 → AI 분석 접근 가능, 관리자 설정 접근 불가", async ({
    page,
  }) => {
    expect(surveyUrl).toBeTruthy();
    await staffLogin(page, "reviewer", REVIEWER_CODE);

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

  test("잘못된 역할 선택으로는 로그인되지 않는다", async ({ page }) => {
    // 확인자 코드로 관리자 로그인 시도 → 실패해야 한다
    await page.goto("/staff/login");
    await page.getByRole("button", { name: "관리자 로그인" }).click();
    await page.getByLabel("Access Code").fill(REVIEWER_CODE);
    await page.getByRole("button", { name: "로그인", exact: true }).click();
    await expect(
      page.getByText("Access Code가 올바르지 않습니다."),
    ).toBeVisible();
  });

  test("확인자도 최대 인원을 1~20명 사이로 변경할 수 있다", async ({ page }) => {
    await staffLogin(page, "reviewer", REVIEWER_CODE);
    await page.goto("/staff/respondents");

    const input = page.getByLabel("최대 인원");
    await expect(input).toBeVisible();

    // 20명으로 변경
    await input.fill("20");
    await page.getByRole("button", { name: "저장" }).click();
    await expect(
      page.getByText("최대 인원을 20명으로 변경했습니다."),
    ).toBeVisible();
    // 변경된 최대 인원이 계정 현황 문구에도 반영된다
    await expect(page.getByText(/\/ 20개/)).toBeVisible();

    // 범위를 벗어난 값은 거부된다 (앞선 토스트와 겹치지 않도록 새로고침 후 확인)
    await page.reload();
    await page.getByLabel("최대 인원").fill("21");
    await page.getByRole("button", { name: "저장" }).click();
    await expect(page.getByText(/20명 이하로 입력해 주세요/)).toBeVisible();

    // 기본값으로 되돌린다
    await page.reload();
    await page.getByLabel("최대 인원").fill("13");
    await page.getByRole("button", { name: "저장" }).click();
    await expect(
      page.getByText("최대 인원을 13명으로 변경했습니다."),
    ).toBeVisible();
  });

  test("Markdown(.md) 파일도 설문으로 변환된다", async ({ page }) => {
    await staffLogin(page, "admin", ADMIN_CODE);
    await page.goto("/staff/surveys/new");

    const markdown = [
      "# E2E 마크다운 설문",
      "",
      "1. 업무 만족도는 어떻습니까?",
      "- [ ] 만족",
      "- [ ] 보통",
      "- [ ] 불만족",
      "",
      "2. 건의사항을 자유롭게 작성해 주세요.",
    ].join("\n");

    await page.locator('input[type="file"]').setInputFiles({
      name: "e2e-survey.md",
      mimeType: "text/markdown",
      buffer: Buffer.from(markdown, "utf8"),
    });
    await page.getByRole("button", { name: "업로드 및 문항 추출" }).click();

    await page.waitForURL("**/staff/surveys/*/edit", { timeout: 30_000 });
    await expect(page.locator('input[id^="q-title-"]').first()).toHaveValue(
      "업무 만족도는 어떻습니까?",
    );
    // GFM 체크박스가 선택지로 변환되었는지 확인
    await expect(page.getByLabel("문항 1 선택지 1")).toHaveValue("만족");
    await expect(page.getByLabel("문항 1 선택지 3")).toHaveValue("불만족");

    // 정리
    const markdownSurveyUrl = new URL(page.url()).pathname.replace("/edit", "");
    await page.goto(markdownSurveyUrl);
    await page.getByRole("button", { name: "설문 삭제" }).click();
    await page.getByRole("button", { name: "삭제", exact: true }).click();
    await page.waitForURL("**/staff");
  });

  test("설문 편집: 문항·선택지 추가/삭제/순서 변경 후 저장된다", async ({
    page,
  }) => {
    await staffLogin(page, "admin", ADMIN_CODE);
    await page.goto("/staff/surveys/new");

    const markdown = [
      "# E2E 편집 검증 설문",
      "",
      "1. 첫 번째 문항입니다.",
      "□ 가 □ 나 □ 다",
      "",
      "2. 두 번째 문항입니다.",
      "□ 예 □ 아니오",
    ].join("\n");

    await page.locator('input[type="file"]').setInputFiles({
      name: "edit-check.md",
      mimeType: "text/markdown",
      buffer: Buffer.from(markdown, "utf8"),
    });
    await page.getByRole("button", { name: "업로드 및 문항 추출" }).click();
    await page.waitForURL("**/staff/surveys/*/edit", { timeout: 30_000 });

    // 제목 수정
    await page.getByLabel("설문 제목").fill("E2E 편집 검증 설문(수정)");

    // 1번 문항 제목 수정 + 선택지 추가 + 순서 변경
    await page.locator('input[id^="q-title-"]').first().fill("수정된 첫 문항");
    await page
      .getByRole("button", { name: "선택지 추가" })
      .first()
      .click();
    await page.getByLabel("문항 1 선택지 4").fill("라");
    await page
      .getByRole("button", { name: "선택지 아래로 이동" })
      .first()
      .click();

    // 2번 문항의 선택지 하나 삭제
    await page
      .getByRole("button", { name: "선택지 삭제" })
      .last()
      .click();

    // 새 문항 추가 (주관식)
    await page.getByRole("button", { name: "문항 추가" }).click();
    await page.locator('input[id^="q-title-"]').last().fill("추가된 주관식 문항");
    await page.getByLabel("문항 유형").last().click();
    await page.getByRole("option", { name: "주관식(서술)" }).click();

    // 저장 → 현황 화면으로 이동하면 성공
    await page.getByRole("button", { name: "저장" }).first().click();
    await expect(page.getByText("설문을 저장했습니다.")).toBeVisible();
    await page.waitForURL(/\/staff\/surveys\/[^/]+$/);

    const editedUrl = new URL(page.url()).pathname;

    // 저장 내용이 실제로 반영되었는지 편집 화면에서 확인
    await page.goto(`${editedUrl}/edit`);
    await expect(page.getByLabel("설문 제목")).toHaveValue(
      "E2E 편집 검증 설문(수정)",
    );
    await expect(page.locator('input[id^="q-title-"]').first()).toHaveValue(
      "수정된 첫 문항",
    );
    await expect(page.locator('input[id^="q-title-"]')).toHaveCount(3);
    await expect(page.getByLabel("문항 1 선택지 1")).toHaveValue("나");
    await expect(page.getByLabel("문항 1 선택지 4")).toHaveValue("라");

    // 정리
    await page.goto(editedUrl);
    await page.getByRole("button", { name: "설문 삭제" }).click();
    await page.getByRole("button", { name: "삭제", exact: true }).click();
    await page.waitForURL("**/staff");
  });

  test("게시 안내: 확인 필요 문항을 처리해야 게시되고, 그 전에는 응답자에게 안 보인다", async ({
    page,
  }) => {
    await staffLogin(page, "admin", ADMIN_CODE);
    await page.goto("/staff/surveys/new");

    // 유형 단서가 없는 문항 → 파서가 '확인 필요'로 표시한다
    const markdown = [
      "# E2E 게시 검증 설문",
      "",
      "1. 유형 단서가 없는 문항입니다",
      "",
      "2. 또 다른 단서 없는 문항입니다",
    ].join("\n");

    await page.locator('input[type="file"]').setInputFiles({
      name: "publish-check.md",
      mimeType: "text/markdown",
      buffer: Buffer.from(markdown, "utf8"),
    });
    await page.getByRole("button", { name: "업로드 및 문항 추출" }).click();
    await page.waitForURL("**/staff/surveys/*/edit", { timeout: 30_000 });
    const publishSurveyUrl = new URL(page.url()).pathname.replace("/edit", "");

    // 편집 화면에 확인 필요 안내가 보인다
    await expect(
      page.getByText(/확인이 필요한 문항이 \d+개 있습니다/),
    ).toBeVisible();

    // 현황 화면: 미게시 경고 + 차단 사유 안내
    await page.goto(publishSurveyUrl);
    await expect(
      page.getByText("아직 게시되지 않았습니다 — 응답자에게 보이지 않습니다"),
    ).toBeVisible();
    await expect(page.getByText(/'확인 필요' 상태의 문항이 \d+개/)).toBeVisible();

    // 이 상태에서 게시를 시도하면 서버가 막는다
    await page.getByRole("button", { name: "게시", exact: true }).click();
    await expect(page.getByText(/확인 처리 후 게시해 주세요/)).toBeVisible();

    // 편집 화면에서 '모두 확인 완료'로 처리 후 저장
    await page.goto(`${publishSurveyUrl}/edit`);
    await page.getByRole("button", { name: "모두 확인 완료로 표시" }).click();
    await page.getByRole("button", { name: "저장" }).first().click();
    await page.waitForURL(/\/staff\/surveys\/[^/]+$/);

    // 이제 게시할 수 있다
    await page.getByRole("button", { name: "게시", exact: true }).click();
    await expect(page.getByText("설문을 게시했습니다.")).toBeVisible();
    await expect(
      page.getByText("게시 중 — 응답자에게 표시됩니다"),
    ).toBeVisible();

    // 정리
    await page.getByRole("button", { name: "설문 삭제" }).click();
    await page.getByRole("button", { name: "삭제", exact: true }).click();
    await page.waitForURL("**/staff");
  });

  test("세션 분리: 응답자로 로그인해도 운영자 세션이 유지된다", async ({
    page,
  }) => {
    expect(surveyUrl).toBeTruthy();

    // 1) 운영자로 로그인
    await staffLogin(page, "admin", ADMIN_CODE);

    // 2) 같은 브라우저에서 응답자로도 로그인 (예전에는 이 시점에 운영자 세션이 날아갔다)
    await page.goto("/respondent/login");
    await page.getByLabel("아이디 (숫자 4자리)").fill(RESPONDENT_ID);
    await page.getByLabel("비밀번호 (숫자 4자리)").fill(RESPONDENT_PW);
    await page.getByRole("button", { name: "로그인", exact: true }).click();
    await page.waitForURL("**/respondent/surveys");

    // 3) 운영자 화면들이 재로그인 없이 그대로 열려야 한다
    for (const path of [
      surveyUrl,
      `${surveyUrl}/edit`,
      `${surveyUrl}/preview`,
      `${surveyUrl}/analysis`,
    ]) {
      await page.goto(path);
      expect(new URL(page.url()).pathname).toBe(path);
    }
    await expect(page.getByText("AI 설문 분석")).toBeVisible();

    // 4) 운영자 로그아웃 후에도 응답자 세션은 살아 있다
    await page.goto("/staff");
    await staffLogout(page);
    await page.goto("/respondent/surveys");
    expect(new URL(page.url()).pathname).toBe("/respondent/surveys");
  });

  test("세션 만료 시 로그인하면 원래 보려던 화면으로 돌아간다", async ({
    browser,
  }) => {
    expect(surveyUrl).toBeTruthy();
    const context = await browser.newContext();
    const page = await context.newPage();

    // 로그인 없이 편집 화면 접근 → 로그인 화면으로 이동(next 유지)
    await page.goto(`${surveyUrl}/edit`);
    await page.waitForURL("**/staff/login**");
    expect(page.url()).toContain("next=");

    // 로그인하면 편집 화면으로 복귀
    await page.getByRole("button", { name: "관리자 로그인" }).click();
    await page.getByLabel("Access Code").fill(ADMIN_CODE);
    await page.getByRole("button", { name: "로그인", exact: true }).click();
    await page.waitForURL(`**${surveyUrl}/edit`);
    expect(new URL(page.url()).pathname).toBe(`${surveyUrl}/edit`);

    await context.close();
  });

  test("AI API 키를 화면에서 설정하고 삭제할 수 있다", async ({ page }) => {
    await staffLogin(page, "admin", ADMIN_CODE);
    await page.goto("/staff/settings");

    await expect(page.getByText("AI API 키")).toBeVisible();

    // 키 입력 → 설정됨으로 바뀌고 마스킹되어 표시된다
    await page.getByLabel(/OpenAI|API 키/).first().fill("sk-e2e-test-key-1234");
    await page
      .getByRole("button", { name: "저장" })
      .first()
      .click();
    await expect(
      page.getByText("OpenAI API 키를 저장했습니다."),
    ).toBeVisible();
    await expect(page.getByText(/설정됨 \(설정 화면\)/).first()).toBeVisible();
    // 입력한 키 원문은 화면에 노출되지 않는다
    await expect(page.getByText("sk-e2e-test-key-1234")).toHaveCount(0);
    await expect(page.getByText(/••••••••1234/)).toBeVisible();

    // 삭제하면 다시 미설정 상태로 돌아간다
    await page.getByRole("button", { name: "삭제" }).first().click();
    await expect(
      page.getByText("OpenAI API 키를 삭제했습니다."),
    ).toBeVisible();
  });

  test("체크박스 '기타' 선택 시 20자 이내 단답을 입력해 제출한다", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // 관리자: '기타'가 포함된 설문 업로드 후 게시
    await staffLogin(page, "admin", ADMIN_CODE);
    // 이전 실행 잔여 데이터 정리 (계정이 남아 있으면 회원 가입이 막힌다)
    await deleteTestSurveys(page, "E2E 기타 입력 설문");
    await deleteRespondentAccount(page, "0077");
    await page.goto("/staff/surveys/new");
    const markdown = [
      "# E2E 기타 입력 설문",
      "",
      "1. 가장 시급한 개선 과제는 무엇입니까?",
      "- [ ] 업무 분장",
      "- [ ] 시설 개선",
      "- [ ] 기타",
    ].join("\n");
    await page.locator('input[type="file"]').setInputFiles({
      name: "other-option.md",
      mimeType: "text/markdown",
      buffer: Buffer.from(markdown, "utf8"),
    });
    await page.getByRole("button", { name: "업로드 및 문항 추출" }).click();
    await page.waitForURL("**/staff/surveys/*/edit", { timeout: 30_000 });

    // '기타' 선택지에 직접 입력 토글이 켜져 있어야 한다
    const otherRow = page.locator("li", {
      has: page.getByLabel("문항 1 선택지 3"),
    });
    await expect(otherRow.getByRole("switch").first()).toBeChecked();

    await page.getByRole("button", { name: "저장" }).first().click();
    await page.waitForURL(/\/staff\/surveys\/[^/]+$/);
    const otherSurveyUrl = new URL(page.url()).pathname;
    const respondentPath = new URL(
      await page.getByLabel("설문 링크").inputValue(),
    ).pathname;
    await page.getByRole("button", { name: "게시", exact: true }).click();
    await expect(page.getByText("설문을 게시했습니다.")).toBeVisible();

    // 응답자: 기타 체크 → 입력란 등장 → 20자 제한 확인 → 제출
    const respondentContext = await browser.newContext();
    const respondent = await respondentContext.newPage();
    await respondent.goto("/respondent/signup");
    await respondent.getByLabel("아이디 (숫자 4자리)").fill("0077");
    await respondent.getByLabel("비밀번호 (숫자 4자리)").fill("0077");
    await respondent.getByRole("button", { name: "회원 가입" }).click();
    await respondent.waitForURL("**/respondent/surveys");

    await respondent.goto(respondentPath);
    const otherInput = respondent.getByLabel(/1번 문항 기타 내용/);
    await expect(otherInput).toHaveCount(0); // 체크 전에는 입력란이 없다

    await respondent.getByText("기타", { exact: true }).click();
    await expect(otherInput).toBeVisible();

    // 20자를 넘겨 입력해도 20자로 잘린다
    await otherInput.fill("가나다라마바사아자차카타파하12345678");
    expect((await otherInput.inputValue()).length).toBe(20);

    await otherInput.fill("정보시스템 개선");
    await respondent.getByRole("button", { name: "제출하기" }).click();
    await respondent.getByRole("button", { name: "제출", exact: true }).click();
    await respondent.waitForURL("**/done");

    // 운영자 통계에 기타 입력값이 보인다
    await page.goto(otherSurveyUrl);
    await expect(page.getByText(/기타 직접 입력/)).toBeVisible();
    await expect(page.getByText("정보시스템 개선")).toBeVisible();

    // 정리
    await page.getByRole("button", { name: "설문 삭제" }).click();
    await page.getByRole("button", { name: "삭제", exact: true }).click();
    await page.waitForURL("**/staff");
    await deleteRespondentAccount(page, "0077");

    await respondentContext.close();
    await context.close();
  });

  test("AI 분석 결과·기록을 초기화할 수 있다", async ({ page }) => {
    expect(surveyUrl).toBeTruthy();
    await staffLogin(page, "admin", ADMIN_CODE);

    const surveyId = surveyUrl.split("/").pop()!;

    // 기록이 없을 때도 초기화 API는 안전하게 동작한다
    const emptyReset = await page.request.delete(
      `/api/surveys/${surveyId}/analysis`,
    );
    expect(emptyReset.ok()).toBe(true);
    expect((await emptyReset.json()).deleted).toBe(0);

    // 잘못된 provider는 거부된다
    const badProvider = await page.request.delete(
      `/api/surveys/${surveyId}/analysis?provider=unknown`,
    );
    expect(badProvider.status()).toBe(400);

    // 기록이 없으면 결과/기록 카드가 보이지 않는다
    await page.goto(`${surveyUrl}/analysis`);
    await expect(page.getByText("AI 설문 분석")).toBeVisible();
    await expect(
      page.locator('[data-slot="card-title"]', { hasText: "분석 기록" }),
    ).toHaveCount(0);

    // AI를 호출하지 않고 분석 기록을 직접 넣어 초기화 UI를 검증한다
    await seedAnalyses(surveyId);
    await page.reload();
    await expect(
      page.locator('[data-slot="card-title"]', { hasText: "분석 결과" }),
    ).toBeVisible();
    await expect(
      page.locator('[data-slot="card-title"]', { hasText: "분석 기록" }),
    ).toBeVisible();

    // GPT 결과만 삭제 → DeepSeek 기록은 남는다
    await page.getByRole("button", { name: "GPT 결과 삭제" }).click();
    await page.getByRole("button", { name: "삭제", exact: true }).click();
    await expect(page.getByText(/분석 기록 1건을 초기화했습니다/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "DeepSeek 결과 삭제" }),
    ).toBeVisible();

    // 전체 초기화 → 결과/기록 카드가 사라진다
    await page.getByRole("button", { name: "전체 초기화" }).click();
    await page.getByRole("button", { name: "삭제", exact: true }).click();
    await expect(page.getByText(/분석 기록 1건을 초기화했습니다/)).toBeVisible();
    await page.reload();
    await expect(
      page.locator('[data-slot="card-title"]', { hasText: "분석 기록" }),
    ).toHaveCount(0);
    await expect(page.getByText("AI 설문 분석")).toBeVisible();
  });

  test("정리: 관리자가 테스트 설문·계정 삭제", async ({ page }) => {
    await staffLogin(page, "admin", ADMIN_CODE);
    await page.goto(surveyUrl);
    await page.getByRole("button", { name: "설문 삭제" }).click();
    await page.getByRole("button", { name: "삭제", exact: true }).click();
    await page.waitForURL("**/staff");
    await deleteRespondentAccount(page, RESPONDENT_ID);
  });
});

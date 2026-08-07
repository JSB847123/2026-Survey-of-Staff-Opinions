/**
 * 응답자 계정(회원가입) 전체 13개 상한 통합 테스트.
 */
import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { createRespondentAccount } from "@/lib/accounts";
import { ACCOUNT_LIMIT_MESSAGE, MAX_RESPONDENT_ACCOUNTS } from "@/lib/constants";

const hasDb = Boolean(process.env.DATABASE_URL);
const describeDb = hasDb ? describe : describe.skip;

describeDb("createRespondentAccount (DB 통합)", () => {
  const prisma = new PrismaClient();
  const runId = randomUUID().slice(0, 6);
  const createdIds: string[] = [];

  afterAll(async () => {
    await prisma.respondentAccount
      .deleteMany({ where: { id: { in: createdIds } } })
      .catch(() => {});
    await prisma.$disconnect();
  });

  it("전체 13개까지 생성되고 14번째는 거부된다", async () => {
    const existing = await prisma.respondentAccount.count();
    const remaining = MAX_RESPONDENT_ACCOUNTS - existing;
    expect(remaining).toBeGreaterThan(0);

    for (let i = 0; i < remaining; i++) {
      const account = await createRespondentAccount(
        prisma,
        `a${runId}${String(i).padStart(2, "0")}`,
        "test-hash",
      );
      createdIds.push(account.id);
    }

    await expect(
      createRespondentAccount(prisma, `a${runId}99`, "test-hash"),
    ).rejects.toThrow(ACCOUNT_LIMIT_MESSAGE);

    expect(await prisma.respondentAccount.count()).toBe(
      MAX_RESPONDENT_ACCOUNTS,
    );
  }, 60_000);

  it("중복 ID는 거부된다", async () => {
    // 위 테스트에서 만든 첫 계정과 동일한 loginId — 상한 이전에 중복 검사가 먼저 걸리지 않도록
    // 계정 하나를 지운 뒤 중복 생성 시도
    const first = await prisma.respondentAccount.findFirst({
      where: { id: { in: createdIds } },
      orderBy: { loginId: "asc" },
    });
    expect(first).toBeTruthy();
    const removed = createdIds.pop()!;
    await prisma.respondentAccount.delete({ where: { id: removed } });

    await expect(
      createRespondentAccount(prisma, first!.loginId, "test-hash"),
    ).rejects.toThrow("이미 사용 중인 ID입니다.");
  });
});

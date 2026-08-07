/**
 * 응답자 계정(회원가입) 상한 통합 테스트.
 * 상한은 전역 설정(AppSetting.maxRespondents)을 따른다.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { createRespondentAccount } from "@/lib/accounts";
import { getMaxRespondents, setMaxRespondents } from "@/lib/settings";
import { accountLimitMessage } from "@/lib/constants";

const hasDb = Boolean(process.env.DATABASE_URL);
const describeDb = hasDb ? describe : describe.skip;

describeDb("createRespondentAccount (DB 통합)", () => {
  const prisma = new PrismaClient();
  const runId = randomUUID().slice(0, 6);
  const createdIds: string[] = [];
  let limit = 13;
  let originalLimit = 13;

  beforeAll(async () => {
    originalLimit = await getMaxRespondents();
    limit = originalLimit;
  });

  afterAll(async () => {
    await prisma.respondentAccount
      .deleteMany({ where: { id: { in: createdIds } } })
      .catch(() => {});
    await setMaxRespondents(originalLimit).catch(() => {});
    await prisma.$disconnect();
  });

  it("설정된 최대 인원까지 생성되고 그 다음은 거부된다", async () => {
    const existing = await prisma.respondentAccount.count();
    const remaining = limit - existing;
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
    ).rejects.toThrow(accountLimitMessage(limit));

    expect(await prisma.respondentAccount.count()).toBe(limit);
  }, 60_000);

  it("중복 ID는 거부된다", async () => {
    const first = await prisma.respondentAccount.findFirst({
      where: { id: { in: createdIds } },
      orderBy: { loginId: "asc" },
    });
    expect(first).toBeTruthy();
    // 상한에 걸리지 않도록 한 자리 비운 뒤 중복 생성 시도
    const removed = createdIds.pop()!;
    await prisma.respondentAccount.delete({ where: { id: removed } });

    await expect(
      createRespondentAccount(prisma, first!.loginId, "test-hash"),
    ).rejects.toThrow("이미 사용 중인 ID입니다.");
  });

  it("최대 인원을 늘리면 그만큼 더 생성할 수 있다", async () => {
    const current = await prisma.respondentAccount.count();
    const newLimit = Math.min(20, current + 2);
    await setMaxRespondents(newLimit);
    limit = newLimit;

    const account = await createRespondentAccount(
      prisma,
      `b${runId}01`,
      "test-hash",
    );
    createdIds.push(account.id);
    expect(await getMaxRespondents()).toBe(newLimit);
  });
});

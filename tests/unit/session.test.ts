import { describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "@/lib/session";

describe("session token", () => {
  it("발급한 토큰을 검증하면 동일한 세션을 돌려준다", async () => {
    const token = await createSessionToken({ kind: "staff", role: "admin" });
    const session = await verifySessionToken(token);
    expect(session).toMatchObject({ kind: "staff", role: "admin" });
  });

  it("응답자 세션도 왕복 검증된다", async () => {
    const token = await createSessionToken({
      kind: "respondent",
      accountId: "acc1",
      surveyId: "survey1",
      loginId: "0012",
    });
    const session = await verifySessionToken(token);
    expect(session).toMatchObject({
      kind: "respondent",
      accountId: "acc1",
      surveyId: "survey1",
    });
  });

  it("변조된 토큰은 null을 반환한다", async () => {
    const token = await createSessionToken({ kind: "staff", role: "reviewer" });
    const tampered = token.slice(0, -4) + "abcd";
    expect(await verifySessionToken(tampered)).toBeNull();
  });

  it("서명이 다른 토큰은 거부한다", async () => {
    const token = await createSessionToken({ kind: "staff", role: "admin" });
    const original = process.env.SESSION_SECRET;
    process.env.SESSION_SECRET = "another-secret-value-0123456789";
    try {
      expect(await verifySessionToken(token)).toBeNull();
    } finally {
      process.env.SESSION_SECRET = original;
    }
  });
});

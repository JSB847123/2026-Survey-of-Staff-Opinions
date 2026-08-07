import { describe, expect, it } from "vitest";
import { fourDigitSchema, respondentLoginSchema } from "@/lib/validation";

describe("fourDigitSchema", () => {
  it("숫자 4자리는 통과한다", () => {
    expect(fourDigitSchema.safeParse("1234").success).toBe(true);
  });

  it("'0012'처럼 0으로 시작하는 값도 문자열로 통과한다", () => {
    const result = fourDigitSchema.safeParse("0012");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("0012");
  });

  it("3자리는 실패한다", () => {
    expect(fourDigitSchema.safeParse("123").success).toBe(false);
  });

  it("5자리는 실패한다", () => {
    expect(fourDigitSchema.safeParse("12345").success).toBe(false);
  });

  it("문자가 포함되면 실패한다", () => {
    expect(fourDigitSchema.safeParse("12a4").success).toBe(false);
    expect(fourDigitSchema.safeParse("abcd").success).toBe(false);
  });

  it("숫자 타입(number)은 실패한다 — 반드시 string이어야 한다", () => {
    expect(fourDigitSchema.safeParse(1234).success).toBe(false);
  });
});

describe("respondentLoginSchema", () => {
  it("올바른 로그인 요청은 통과한다", () => {
    expect(
      respondentLoginSchema.safeParse({
        slug: "abc123",
        loginId: "0012",
        password: "0000",
      }).success,
    ).toBe(true);
  });

  it("ID 형식이 잘못되면 실패한다", () => {
    expect(
      respondentLoginSchema.safeParse({
        slug: "abc123",
        loginId: "12345",
        password: "0000",
      }).success,
    ).toBe(false);
  });
});

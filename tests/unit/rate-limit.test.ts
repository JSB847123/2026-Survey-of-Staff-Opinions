import { describe, expect, it } from "vitest";
import { isRateLimited, recordFailure, rateLimit } from "@/lib/rate-limit";

const WINDOW = 60_000;

describe("실패 기반 rate limit", () => {
  it("성공만 반복하면(실패 기록 없음) 제한되지 않는다", () => {
    const key = `success-only-${Math.random()}`;
    for (let i = 0; i < 50; i++) {
      expect(isRateLimited(key, 10, WINDOW)).toBe(false);
    }
  });

  it("실패가 한도에 도달하면 차단된다", () => {
    const key = `failures-${Math.random()}`;
    for (let i = 0; i < 9; i++) {
      recordFailure(key, WINDOW);
      expect(isRateLimited(key, 10, WINDOW)).toBe(false);
    }
    recordFailure(key, WINDOW); // 10번째 실패
    expect(isRateLimited(key, 10, WINDOW)).toBe(true);
  });

  it("키가 다르면 서로 영향을 주지 않는다", () => {
    const a = `key-a-${Math.random()}`;
    const b = `key-b-${Math.random()}`;
    for (let i = 0; i < 12; i++) recordFailure(a, WINDOW);
    expect(isRateLimited(a, 10, WINDOW)).toBe(true);
    expect(isRateLimited(b, 10, WINDOW)).toBe(false);
  });
});

describe("횟수 기반 rate limit (회원 가입 등)", () => {
  it("한도까지만 허용한다", () => {
    const key = `signup-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(key, 5, WINDOW)).toBe(true);
    }
    expect(rateLimit(key, 5, WINDOW)).toBe(false);
  });
});

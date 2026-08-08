import { describe, expect, it } from "vitest";
import { cookieNameFor } from "@/lib/session";
import {
  LEGACY_SESSION_COOKIE,
  RESPONDENT_SESSION_COOKIE,
  STAFF_SESSION_COOKIE,
} from "@/lib/constants";

describe("세션 쿠키 분리", () => {
  it("운영자와 응답자는 서로 다른 쿠키를 쓴다", () => {
    expect(STAFF_SESSION_COOKIE).not.toBe(RESPONDENT_SESSION_COOKIE);
  });

  it("역할에 맞는 쿠키 이름을 돌려준다", () => {
    expect(cookieNameFor("staff")).toBe(STAFF_SESSION_COOKIE);
    expect(cookieNameFor("respondent")).toBe(RESPONDENT_SESSION_COOKIE);
  });

  it("레거시 쿠키 이름은 새 쿠키들과 겹치지 않는다", () => {
    expect(LEGACY_SESSION_COOKIE).not.toBe(STAFF_SESSION_COOKIE);
    expect(LEGACY_SESSION_COOKIE).not.toBe(RESPONDENT_SESSION_COOKIE);
  });
});

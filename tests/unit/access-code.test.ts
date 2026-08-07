import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isRoleCodeConfigured, resolveStaffRole } from "@/lib/access-code";

const ORIGINAL_ADMIN = process.env.ADMIN_ACCESS_CODE;
const ORIGINAL_REVIEWER = process.env.REVIEWER_ACCESS_CODE;

describe("resolveStaffRole", () => {
  beforeEach(() => {
    // 테스트 전용 더미 코드 (실제 운영 코드와 무관)
    process.env.ADMIN_ACCESS_CODE = "test-admin-code";
    process.env.REVIEWER_ACCESS_CODE = "test-reviewer-code";
  });

  afterEach(() => {
    process.env.ADMIN_ACCESS_CODE = ORIGINAL_ADMIN;
    process.env.REVIEWER_ACCESS_CODE = ORIGINAL_REVIEWER;
  });

  it("관리자 코드는 admin을 반환한다", () => {
    expect(resolveStaffRole("test-admin-code")).toBe("admin");
  });

  it("확인자 코드는 reviewer를 반환한다", () => {
    expect(resolveStaffRole("test-reviewer-code")).toBe("reviewer");
  });

  it("잘못된 코드는 null을 반환한다", () => {
    expect(resolveStaffRole("wrong-code")).toBeNull();
    expect(resolveStaffRole("")).toBeNull();
  });

  it("환경변수가 없으면 항상 null을 반환한다", () => {
    delete process.env.ADMIN_ACCESS_CODE;
    delete process.env.REVIEWER_ACCESS_CODE;
    expect(resolveStaffRole("test-admin-code")).toBeNull();
  });

  it("isRoleCodeConfigured: 설정 여부를 역할별로 판별한다", () => {
    expect(isRoleCodeConfigured("admin")).toBe(true);
    expect(isRoleCodeConfigured("reviewer")).toBe(true);
    delete process.env.ADMIN_ACCESS_CODE;
    expect(isRoleCodeConfigured("admin")).toBe(false);
    expect(isRoleCodeConfigured("reviewer")).toBe(true);
    process.env.REVIEWER_ACCESS_CODE = "  ";
    expect(isRoleCodeConfigured("reviewer")).toBe(false);
  });
});

import "server-only";
import { timingSafeEqual } from "node:crypto";
import type { StaffRole } from "./session";

/** 타이밍 공격을 피하기 위한 상수 시간 비교 */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    // 길이가 다르면 같은 길이의 더미 비교로 시간 균일화
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/**
 * Access Code로 운영자 역할을 판별한다.
 * 실제 코드는 환경변수(ADMIN_ACCESS_CODE / REVIEWER_ACCESS_CODE)로만 주입된다.
 */
export function resolveStaffRole(accessCode: string): StaffRole | null {
  const adminCode = process.env.ADMIN_ACCESS_CODE;
  const reviewerCode = process.env.REVIEWER_ACCESS_CODE;

  if (adminCode && safeEqual(accessCode, adminCode)) return "admin";
  if (reviewerCode && safeEqual(accessCode, reviewerCode)) return "reviewer";
  return null;
}

/** 해당 역할의 Access Code 환경변수가 설정되어 있는지 확인 */
export function isRoleCodeConfigured(role: StaffRole): boolean {
  const value =
    role === "admin"
      ? process.env.ADMIN_ACCESS_CODE
      : process.env.REVIEWER_ACCESS_CODE;
  return Boolean(value && value.trim().length > 0);
}

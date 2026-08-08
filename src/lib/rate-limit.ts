import "server-only";

/**
 * 간단한 인메모리 슬라이딩 윈도우 rate limiter.
 * serverless 인스턴스별로 독립적이므로 완전한 방어는 아니며,
 * 계정 잠금(DB 기반 lockedUntil)과 함께 이중으로 사용한다.
 */
const buckets = new Map<string, number[]>();

const MAX_BUCKETS = 10_000;

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  if (buckets.size > MAX_BUCKETS) buckets.clear();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  return true;
}

/**
 * 기록된 실패 횟수가 한도를 넘었는지만 확인한다 (카운트는 증가시키지 않는다).
 * 로그인처럼 '실패한 시도'만 제한해야 하는 경우에 사용한다.
 */
export function isRateLimited(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  buckets.set(key, hits);
  return hits.length >= limit;
}

/** 실패한 시도를 기록한다. */
export function recordFailure(key: string, windowMs: number): void {
  const now = Date.now();
  if (buckets.size > MAX_BUCKETS) buckets.clear();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  hits.push(now);
  buckets.set(key, hits);
}

export function clientIpFromHeaders(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}

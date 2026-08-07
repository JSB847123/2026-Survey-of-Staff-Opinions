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

export function clientIpFromHeaders(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}

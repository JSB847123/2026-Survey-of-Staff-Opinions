import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, maskSecret } from "@/lib/crypto";

describe("API 키 암호화", () => {
  it("암호화한 값을 다시 복호화할 수 있다", () => {
    const plain = "sk-test-1234567890abcdef";
    const encrypted = encryptSecret(plain);
    expect(encrypted).not.toContain(plain);
    expect(decryptSecret(encrypted)).toBe(plain);
  });

  it("같은 값도 매번 다른 암호문이 된다 (IV 랜덤)", () => {
    const plain = "sk-test-key";
    expect(encryptSecret(plain)).not.toBe(encryptSecret(plain));
  });

  it("변조된 암호문은 복호화되지 않는다", () => {
    const encrypted = encryptSecret("sk-test-key");
    const tampered = `${encrypted.slice(0, -4)}AAAA`;
    expect(decryptSecret(tampered)).toBeNull();
  });

  it("형식이 잘못된 값은 null을 반환한다", () => {
    expect(decryptSecret("not-encrypted")).toBeNull();
    expect(decryptSecret("")).toBeNull();
  });

  it("시크릿이 바뀌면 복호화되지 않는다", () => {
    const encrypted = encryptSecret("sk-test-key");
    const original = process.env.SESSION_SECRET;
    process.env.SESSION_SECRET = "completely-different-secret-value";
    try {
      expect(decryptSecret(encrypted)).toBeNull();
    } finally {
      process.env.SESSION_SECRET = original;
    }
  });

  it("마스킹은 뒤 4자리만 남긴다", () => {
    const masked = maskSecret("sk-abcdefghij1234");
    expect(masked).toContain("1234");
    expect(masked).not.toContain("abcdefghij");
  });
});

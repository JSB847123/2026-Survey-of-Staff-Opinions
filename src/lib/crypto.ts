import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const SALT = "survey-app-secret-v1";

function getKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET 환경변수가 설정되지 않았습니다.");
  }
  return scryptSync(secret, SALT, 32);
}

/**
 * API 키처럼 민감한 값을 DB에 저장하기 위해 암호화한다.
 * 형식: iv(base64).authTag(base64).cipherText(base64)
 */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
}

/** 복호화에 실패하면(시크릿 변경 등) null을 반환한다. */
export function decryptSecret(payload: string): string | null {
  try {
    const [ivB64, tagB64, dataB64] = payload.split(".");
    if (!ivB64 || !tagB64 || !dataB64) return null;
    const decipher = createDecipheriv(
      ALGORITHM,
      getKey(),
      Buffer.from(ivB64, "base64"),
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64")),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}

/** 화면에 안전하게 보여줄 마스킹 (예: sk-…A1b2) */
export function maskSecret(value: string): string {
  const tail = value.slice(-4);
  return `••••••••${tail}`;
}

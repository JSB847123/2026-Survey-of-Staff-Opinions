import "server-only";
import { prisma } from "./db";
import { decryptSecret, encryptSecret, maskSecret } from "./crypto";

const SINGLETON_ID = "singleton";

export type AiProviderId = "openai" | "deepseek";

/** 키가 어디서 왔는지 — 화면 안내용 */
export type KeySource = "설정 화면" | "환경변수" | "미설정";

export type AiKeyStatus = {
  provider: AiProviderId;
  configured: boolean;
  source: KeySource;
  /** 마스킹된 값 (설정 화면에서 입력한 경우에만) */
  masked: string | null;
};

const ENV_NAMES: Record<AiProviderId, string> = {
  openai: "OPENAI_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
};

function envKey(provider: AiProviderId): string | null {
  const value = process.env[ENV_NAMES[provider]]?.trim();
  return value ? value : null;
}

async function storedKey(provider: AiProviderId): Promise<string | null> {
  const setting = await prisma.appSetting.findUnique({
    where: { id: SINGLETON_ID },
    select: { openaiApiKeyEnc: true, deepseekApiKeyEnc: true },
  });
  const enc =
    provider === "openai"
      ? setting?.openaiApiKeyEnc
      : setting?.deepseekApiKeyEnc;
  return enc ? decryptSecret(enc) : null;
}

/**
 * 실제 API 호출에 사용할 키.
 * 설정 화면에서 입력한 키를 우선 사용하고, 없으면 환경변수를 쓴다.
 */
export async function getAiApiKey(
  provider: AiProviderId,
): Promise<string | null> {
  return (await storedKey(provider)) ?? envKey(provider);
}

/** 값 자체는 노출하지 않고 설정 상태만 알려준다. */
export async function getAiKeyStatuses(): Promise<AiKeyStatus[]> {
  const providers: AiProviderId[] = ["openai", "deepseek"];
  return Promise.all(
    providers.map(async (provider) => {
      const stored = await storedKey(provider);
      if (stored) {
        return {
          provider,
          configured: true,
          source: "설정 화면" as const,
          masked: maskSecret(stored),
        };
      }
      if (envKey(provider)) {
        return {
          provider,
          configured: true,
          source: "환경변수" as const,
          masked: null,
        };
      }
      return {
        provider,
        configured: false,
        source: "미설정" as const,
        masked: null,
      };
    }),
  );
}

/** 키 저장 (null이면 저장된 키 삭제 — 환경변수로 되돌아간다) */
export async function setAiApiKey(
  provider: AiProviderId,
  apiKey: string | null,
): Promise<void> {
  const enc = apiKey ? encryptSecret(apiKey) : null;
  const data =
    provider === "openai"
      ? { openaiApiKeyEnc: enc }
      : { deepseekApiKeyEnc: enc };

  await prisma.appSetting.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, ...data },
    update: data,
  });
}

export function envNameFor(provider: AiProviderId): string {
  return ENV_NAMES[provider];
}

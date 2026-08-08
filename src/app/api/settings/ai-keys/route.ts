import { NextRequest } from "next/server";
import { handleApi } from "@/lib/api";
import { requireAdmin, requireStaff } from "@/lib/auth";
import { aiKeySchema } from "@/lib/validation";
import { getAiKeyStatuses, setAiApiKey } from "@/lib/ai-keys";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

/** 키 값 자체는 절대 반환하지 않고 설정 상태만 알려준다. */
export async function GET() {
  return handleApi(async () => {
    await requireStaff();
    return { keys: await getAiKeyStatuses() };
  });
}

/** 키 저장/삭제 — 관리자 전용 */
export async function PUT(request: NextRequest) {
  return handleApi(async () => {
    const session = await requireAdmin();
    const body = aiKeySchema.parse(await request.json());

    const apiKey = body.apiKey?.trim() ? body.apiKey.trim() : null;
    await setAiApiKey(body.provider, apiKey);

    await logAudit({
      actorRole: session.role,
      action: apiKey ? "settings.ai_key_set" : "settings.ai_key_clear",
      targetType: "appSetting",
      targetId: "singleton",
      // 키 값은 기록하지 않는다.
      metadata: { provider: body.provider },
    });

    return { keys: await getAiKeyStatuses() };
  });
}

import { NextRequest } from "next/server";
import { handleApi } from "@/lib/api";
import { requireStaff } from "@/lib/auth";
import { getMaxRespondents, setMaxRespondents } from "@/lib/settings";
import { maxRespondentsSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET() {
  return handleApi(async () => {
    await requireStaff();
    return { maxRespondents: await getMaxRespondents() };
  });
}

/** 최대 인원 변경 — 관리자와 확인자 모두 가능 */
export async function PATCH(request: NextRequest) {
  return handleApi(async () => {
    const session = await requireStaff();
    const body = maxRespondentsSchema.parse(await request.json());
    const maxRespondents = await setMaxRespondents(body.maxRespondents);

    await logAudit({
      actorRole: session.role,
      action: "settings.max_respondents",
      targetType: "appSetting",
      targetId: "singleton",
      metadata: { maxRespondents },
    });

    return { maxRespondents };
  });
}

import { NextRequest } from "next/server";
import { hash } from "@node-rs/argon2";
import { handleApi } from "@/lib/api";
import { requireAdmin, requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { respondentCreateSchema } from "@/lib/validation";
import { createRespondentAccount } from "@/lib/accounts";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET() {
  return handleApi(async () => {
    await requireStaff();
    const accounts = await prisma.respondentAccount.findMany({
      orderBy: { loginId: "asc" },
      select: {
        id: true,
        loginId: true,
        active: true,
        createdAt: true,
        _count: { select: { responses: true } },
      },
    });
    return { accounts };
  });
}

/** 관리자가 직접 응답자 계정을 만들 수도 있다 (전체 13개 제한 동일 적용) */
export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const session = await requireAdmin();
    const body = respondentCreateSchema.parse(await request.json());

    const passwordHash = await hash(body.password);
    const account = await createRespondentAccount(
      prisma,
      body.loginId,
      passwordHash,
    );

    await logAudit({
      actorRole: session.role,
      action: "respondent.create",
      targetType: "respondentAccount",
      targetId: account.id,
      metadata: { loginId: body.loginId },
    });
    return { account };
  });
}

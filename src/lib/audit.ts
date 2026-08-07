import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";

export async function logAudit(input: {
  actorRole: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorRole: input.actorRole,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        metadata: (input.metadata ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
      },
    });
  } catch (error) {
    // 감사 로그 실패가 본 작업을 막지 않도록 한다.
    console.error("[audit] failed to write audit log:", error);
  }
}

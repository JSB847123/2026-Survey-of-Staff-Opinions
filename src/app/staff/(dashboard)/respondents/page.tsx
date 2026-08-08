import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getStaffSession } from "@/lib/session";
import { getMaxRespondents } from "@/lib/settings";
import { RespondentsManager } from "@/components/staff/respondents-manager";
import { RespondentLimitCard } from "@/components/staff/respondent-limit-card";

export const metadata: Metadata = { title: "응답자 계정" };
export const dynamic = "force-dynamic";

export default async function RespondentsPage() {
  const session = await getStaffSession();
  const isAdmin = session?.role === "admin";

  const [accounts, maxRespondents] = await Promise.all([
    prisma.respondentAccount.findMany({
      orderBy: { loginId: "asc" },
      select: {
        id: true,
        loginId: true,
        active: true,
        createdAt: true,
        _count: { select: { responses: true } },
      },
    }),
    getMaxRespondents(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">응답자 계정</h1>
        <p className="text-sm text-muted-foreground">
          응답자는 직접 회원 가입할 수 있습니다. 현재 계정{" "}
          {accounts.length} / {maxRespondents}개 (최대 인원은 아래에서 1~20명
          사이로 변경할 수 있습니다)
        </p>
      </div>
      <RespondentLimitCard
        current={maxRespondents}
        accountCount={accounts.length}
      />
      <RespondentsManager
        isAdmin={isAdmin}
        maxAccounts={maxRespondents}
        initialAccounts={accounts.map((a) => ({
          id: a.id,
          loginId: a.loginId,
          active: a.active,
          responseCount: a._count.responses,
          createdAt: a.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}

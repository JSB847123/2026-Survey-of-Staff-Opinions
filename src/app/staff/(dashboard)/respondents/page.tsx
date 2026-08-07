import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { RespondentsManager } from "@/components/staff/respondents-manager";

export const metadata: Metadata = { title: "응답자 계정" };
export const dynamic = "force-dynamic";

export default async function RespondentsPage() {
  const session = await getSession();
  const isAdmin = session?.kind === "staff" && session.role === "admin";

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

  return (
    <RespondentsManager
      isAdmin={isAdmin}
      initialAccounts={accounts.map((a) => ({
        id: a.id,
        loginId: a.loginId,
        active: a.active,
        responseCount: a._count.responses,
        createdAt: a.createdAt.toISOString(),
      }))}
    />
  );
}

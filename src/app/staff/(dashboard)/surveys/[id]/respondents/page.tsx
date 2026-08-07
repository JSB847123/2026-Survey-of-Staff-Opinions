import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { RespondentsManager } from "@/components/staff/respondents-manager";

export const metadata: Metadata = { title: "응답자 관리" };
export const dynamic = "force-dynamic";

export default async function RespondentsPage({
  params,
}: PageProps<"/staff/surveys/[id]/respondents">) {
  const { id } = await params;
  const session = await getSession();
  const isAdmin = session?.kind === "staff" && session.role === "admin";

  const survey = await prisma.survey.findUnique({
    where: { id },
    select: { id: true, title: true, maxRespondents: true },
  });
  if (!survey) notFound();

  const accounts = await prisma.respondentAccount.findMany({
    where: { surveyId: id },
    orderBy: { loginId: "asc" },
    select: {
      id: true,
      loginId: true,
      active: true,
      response: { select: { submittedAt: true } },
    },
  });

  return (
    <RespondentsManager
      surveyId={survey.id}
      surveyTitle={survey.title}
      maxRespondents={survey.maxRespondents}
      isAdmin={isAdmin}
      initialAccounts={accounts.map((a) => ({
        id: a.id,
        loginId: a.loginId,
        active: a.active,
        submittedAt: a.response?.submittedAt?.toISOString() ?? null,
      }))}
    />
  );
}

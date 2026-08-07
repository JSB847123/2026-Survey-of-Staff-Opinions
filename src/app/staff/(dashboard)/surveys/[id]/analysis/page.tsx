import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { AnalysisPanel, type AnalysisDto } from "@/components/staff/analysis-panel";

export const metadata: Metadata = { title: "AI 분석" };
export const dynamic = "force-dynamic";

export default async function AnalysisPage({
  params,
}: PageProps<"/staff/surveys/[id]/analysis">) {
  const { id } = await params;
  const survey = await prisma.survey.findUnique({
    where: { id },
    select: { id: true, title: true, responseCount: true, version: true },
  });
  if (!survey) notFound();

  const analyses = await prisma.analysis.findMany({
    where: { surveyId: id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const dtos: AnalysisDto[] = analyses.map((a) => ({
    id: a.id,
    provider: a.provider,
    model: a.model,
    resultJson: a.resultJson as AnalysisDto["resultJson"],
    responseCount: a.responseCount,
    surveyVersion: a.surveyVersion,
    createdAt: a.createdAt.toISOString(),
    createdByRole: a.createdByRole,
  }));

  return (
    <AnalysisPanel
      surveyId={survey.id}
      surveyTitle={survey.title}
      responseCount={survey.responseCount}
      initialAnalyses={dtos}
    />
  );
}

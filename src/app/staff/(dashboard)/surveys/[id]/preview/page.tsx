import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import type { SurveyDto } from "@/lib/survey-dto";
import { SurveyAnswerForm } from "@/components/survey/survey-answer-form";

export const metadata: Metadata = { title: "설문 미리보기" };
export const dynamic = "force-dynamic";

export default async function SurveyPreviewPage({
  params,
}: PageProps<"/staff/surveys/[id]/preview">) {
  const { id } = await params;
  const survey = await prisma.survey.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: { options: { orderBy: { order: "asc" } } },
      },
    },
  });
  if (!survey) notFound();

  const dto: SurveyDto = {
    id: survey.id,
    title: survey.title,
    description: survey.description,
    slug: survey.slug,
    status: survey.status,
    responseCount: survey.responseCount,
    maxRespondents: survey.maxRespondents,
    questions: survey.questions.map((q) => ({
      id: q.id,
      order: q.order,
      type: q.type,
      title: q.title,
      description: q.description,
      required: q.required,
      needsReview: q.needsReview,
      options: q.options.map((o) => ({
        id: o.id,
        order: o.order,
        label: o.label,
        allowsText: o.allowsText,
      })),
    })),
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Button
        variant="ghost"
        size="sm"
        nativeButton={false}
            render={<Link href={`/staff/surveys/${id}`} />}
      >
        <ArrowLeft className="size-4" /> 설문 현황으로 돌아가기
      </Button>
      <SurveyAnswerForm survey={dto} mode="preview" />
    </div>
  );
}

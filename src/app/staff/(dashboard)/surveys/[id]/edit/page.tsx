import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import type { SurveyDto } from "@/lib/survey-dto";
import { SurveyEditor } from "@/components/staff/survey-editor";

export const metadata: Metadata = { title: "설문 편집" };
export const dynamic = "force-dynamic";

export default async function SurveyEditPage({
  params,
}: PageProps<"/staff/surveys/[id]/edit">) {
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
      })),
    })),
  };

  return <SurveyEditor initialSurvey={dto} />;
}

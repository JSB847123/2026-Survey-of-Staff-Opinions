import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, LogIn, UserRoundPlus } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { ALREADY_SUBMITTED_MESSAGE } from "@/lib/constants";
import type { SurveyDto } from "@/lib/survey-dto";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RespondentLogoutButton } from "@/components/survey/respondent-logout-button";
import { SurveyAnswerForm } from "@/components/survey/survey-answer-form";

export const metadata: Metadata = { title: "설문 응답" };
export const dynamic = "force-dynamic";

function Shell({
  children,
  loggedIn,
}: {
  children: React.ReactNode;
  loggedIn?: boolean;
}) {
  return (
    <main className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-4 py-3 sm:px-6">
        <span className="text-sm font-semibold tracking-tight">
          직원 의견 설문조사
        </span>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          {loggedIn && <RespondentLogoutButton />}
        </div>
      </header>
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-4">{children}</div>
    </main>
  );
}

export default async function RespondentSurveyPage({
  params,
}: PageProps<"/s/[slug]">) {
  const { slug } = await params;

  const survey = await prisma.survey.findUnique({
    where: { slug },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: { options: { orderBy: { order: "asc" } } },
      },
    },
  });

  if (!survey || survey.status === "DRAFT") {
    return (
      <Shell>
        <Card>
          <CardHeader className="text-center">
            <CardTitle>설문을 찾을 수 없습니다</CardTitle>
            <CardDescription>
              링크가 올바른지 확인하거나 담당자에게 문의해 주세요.
            </CardDescription>
          </CardHeader>
        </Card>
      </Shell>
    );
  }

  if (survey.status === "CLOSED") {
    return (
      <Shell>
        <Card>
          <CardHeader className="text-center">
            <CardTitle>종료된 설문입니다</CardTitle>
            <CardDescription>
              이 설문은 더 이상 응답을 받지 않습니다. 참여해 주셔서 감사합니다.
            </CardDescription>
          </CardHeader>
        </Card>
      </Shell>
    );
  }

  const session = await getSession();

  if (!session || session.kind !== "respondent") {
    const next = encodeURIComponent(`/s/${slug}`);
    return (
      <Shell>
        <div className="mx-auto max-w-sm space-y-6 pt-8">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold tracking-tight">{survey.title}</h1>
            <p className="text-sm text-muted-foreground">
              설문에 참여하려면 회원 가입 또는 로그인이 필요합니다.
            </p>
          </div>
          <Card>
            <CardContent className="space-y-3 pt-6">
              <Button
                className="h-11 w-full"
                nativeButton={false}
            render={<Link href={`/respondent/signup?next=${next}`} />}
              >
                <UserRoundPlus className="size-4" /> 회원 가입
              </Button>
              <Button
                variant="outline"
                className="h-11 w-full"
                nativeButton={false}
            render={<Link href={`/respondent/login?next=${next}`} />}
              >
                <LogIn className="size-4" /> 로그인
              </Button>
            </CardContent>
          </Card>
        </div>
      </Shell>
    );
  }

  const existing = await prisma.surveyResponse.findUnique({
    where: {
      surveyId_respondentAccountId: {
        surveyId: survey.id,
        respondentAccountId: session.accountId,
      },
    },
  });

  if (existing) {
    return (
      <Shell loggedIn>
        <Card>
          <CardHeader className="text-center">
            <CardTitle>{ALREADY_SUBMITTED_MESSAGE}</CardTitle>
            <CardDescription>
              한 계정으로는 한 번만 응답할 수 있습니다. 참여해 주셔서
              감사합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button
              variant="outline"
              nativeButton={false}
            render={<Link href="/respondent/surveys" />}
            >
              <ArrowLeft className="size-4" /> 설문 목록으로
            </Button>
          </CardContent>
        </Card>
      </Shell>
    );
  }

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

  return (
    <Shell loggedIn>
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
            render={<Link href="/respondent/surveys" />}
        >
          <ArrowLeft className="size-4" /> 설문 목록으로
        </Button>
        <SurveyAnswerForm survey={dto} mode="live" />
      </div>
    </Shell>
  );
}

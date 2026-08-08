import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BarChart3,
  Eye,
  Pencil,
  Sparkles,
  Users,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { getStaffSession } from "@/lib/session";
import { computeSurveyStats } from "@/lib/stats";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SURVEY_STATUS_LABEL } from "@/lib/survey-dto";
import { SurveyActions } from "@/components/staff/survey-actions";
import { PublishStatusBanner } from "@/components/staff/publish-status-banner";
import { SurveyLinkCard } from "@/components/staff/survey-link-card";
import { StatsBars } from "@/components/staff/stats-bars";

export const metadata: Metadata = { title: "설문 현황" };
export const dynamic = "force-dynamic";

export default async function SurveyDetailPage({
  params,
}: PageProps<"/staff/surveys/[id]">) {
  const { id } = await params;
  const session = await getStaffSession();
  const isAdmin = session?.role === "admin";

  const survey = await prisma.survey.findUnique({
    where: { id },
    include: { _count: { select: { questions: true } } },
  });
  if (!survey) notFound();

  const needsReviewCount = await prisma.question.count({
    where: { surveyId: id, needsReview: true },
  });

  const stats = await computeSurveyStats(id);
  // 제출/미제출/응답률이 공유하는 분모 (참여 대상 인원)
  const participantTotal = stats.submittedCount + stats.notSubmittedCount;

  const statusVariant =
    survey.status === "PUBLISHED"
      ? "default"
      : survey.status === "DRAFT"
        ? "secondary"
        : "outline";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{survey.title}</h1>
            <Badge variant={statusVariant}>
              {SURVEY_STATUS_LABEL[survey.status]}
            </Badge>
          </div>
          {survey.description && (
            <p className="text-sm text-muted-foreground">{survey.description}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`/staff/surveys/${id}/edit`} />}
          >
            <Pencil className="size-4" /> 편집
          </Button>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`/staff/surveys/${id}/preview`} />}
          >
            <Eye className="size-4" /> 미리보기
          </Button>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/staff/respondents" />}
          >
            <Users className="size-4" /> 응답자 계정
          </Button>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`/staff/surveys/${id}/analysis`} />}
          >
            <Sparkles className="size-4" /> AI 분석
          </Button>
        </div>
      </div>

      <PublishStatusBanner
        surveyId={survey.id}
        status={survey.status}
        questionCount={survey._count.questions}
        needsReviewCount={needsReviewCount}
      />

      {/* 세 숫자(제출/미제출/응답률)는 모두 '참여 대상' 기준으로 일관되게 계산된다. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>제출 완료</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {stats.submittedCount}
              <span className="text-base font-normal text-muted-foreground">
                {" "}
                / {participantTotal}명
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            참여 대상(활성 응답자 계정) 기준
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>미제출</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {stats.notSubmittedCount}
              <span className="text-base font-normal text-muted-foreground">
                명
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            아직 응답하지 않은 계정
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>응답률</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {stats.responseRate}%
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            {stats.submittedCount} / {participantTotal}명
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>응답자 계정</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {stats.respondentTotal}
              <span className="text-base font-normal text-muted-foreground">
                {" "}
                / {stats.maxRespondents}명
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            가입 계정 수 / 최대 인원
          </CardContent>
        </Card>
      </div>

      {participantTotal === 0 && (
        <Alert>
          <Users className="size-4" />
          <AlertTitle>아직 응답자 계정이 없습니다</AlertTitle>
          <AlertDescription>
            응답자가 회원 가입하거나 관리자가 계정을 만들면 참여 대상에
            반영됩니다.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <SurveyLinkCard slug={survey.slug} status={survey.status} />
        <SurveyActions
          surveyId={survey.id}
          status={survey.status}
          isAdmin={isAdmin}
          questionCount={survey._count.questions}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="size-5" aria-hidden /> 문항별 응답 통계
          </CardTitle>
          <CardDescription>
            객관식 통계는 서버에서 정확하게 계산됩니다. (제출 인원 기준)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StatsBars questions={stats.questions} submittedCount={stats.submittedCount} />
        </CardContent>
      </Card>
    </div>
  );
}

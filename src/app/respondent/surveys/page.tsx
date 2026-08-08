import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, ClipboardList } from "lucide-react";
import { prisma } from "@/lib/db";
import { getRespondentSession } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { RespondentLogoutButton } from "@/components/survey/respondent-logout-button";

export const metadata: Metadata = { title: "설문 목록" };
export const dynamic = "force-dynamic";

export default async function RespondentSurveysPage() {
  const session = await getRespondentSession();
  if (!session) {
    redirect("/respondent/login");
  }

  const [surveys, myResponses] = await Promise.all([
    prisma.survey.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        slug: true,
        responseCount: true,
        maxRespondents: true,
      },
    }),
    prisma.surveyResponse.findMany({
      where: { respondentAccountId: session.accountId },
      select: { surveyId: true },
    }),
  ]);

  const submittedSurveyIds = new Set(myResponses.map((r) => r.surveyId));

  return (
    <main className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-4 py-3 sm:px-6">
        <span className="text-sm font-semibold tracking-tight">
          직원 의견 설문조사
        </span>
        <div className="flex items-center gap-1">
          <span className="mr-2 text-sm text-muted-foreground">
            {session.loginId}님
          </span>
          <ThemeToggle />
          <RespondentLogoutButton />
        </div>
      </header>
      <div className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">진행 중인 설문</h1>
          <p className="text-sm text-muted-foreground">
            참여할 설문을 선택해 주세요. 설문마다 한 번만 응답할 수 있습니다.
          </p>
        </div>

        {surveys.length === 0 ? (
          <Card>
            <CardHeader className="items-center text-center">
              <ClipboardList
                className="size-10 text-muted-foreground"
                aria-hidden
              />
              <CardTitle>진행 중인 설문이 없습니다</CardTitle>
              <CardDescription>
                설문이 게시되면 이곳에 표시됩니다.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <ul className="space-y-4">
            {surveys.map((survey) => {
              const submitted = submittedSurveyIds.has(survey.id);
              const full =
                !submitted && survey.responseCount >= survey.maxRespondents;
              return (
                <li key={survey.id}>
                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base leading-snug">
                          {survey.title}
                        </CardTitle>
                        {submitted ? (
                          <Badge>
                            <CheckCircle2 className="size-3" /> 제출 완료
                          </Badge>
                        ) : full ? (
                          <Badge variant="outline">정원 마감</Badge>
                        ) : (
                          <Badge variant="secondary">참여 가능</Badge>
                        )}
                      </div>
                      {survey.description && (
                        <CardDescription className="line-clamp-2 whitespace-pre-wrap">
                          {survey.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      {submitted ? (
                        <p className="text-sm text-muted-foreground">
                          이미 설문 응답을 완료했습니다. 참여해 주셔서
                          감사합니다.
                        </p>
                      ) : full ? (
                        <p className="text-sm text-muted-foreground">
                          응답 정원({survey.maxRespondents}명)이 가득 찼습니다.
                        </p>
                      ) : (
                        <Button
                          className="w-full sm:w-auto"
                          nativeButton={false}
            render={<Link href={`/s/${survey.slug}`} />}
                        >
                          설문 참여하기
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}

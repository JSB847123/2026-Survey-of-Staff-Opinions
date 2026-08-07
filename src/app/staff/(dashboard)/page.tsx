import type { Metadata } from "next";
import Link from "next/link";
import { FileUp } from "lucide-react";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "설문 목록" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  DRAFT: { label: "작성 중", variant: "secondary" },
  PUBLISHED: { label: "진행 중", variant: "default" },
  CLOSED: { label: "종료", variant: "outline" },
};

export default async function StaffHomePage() {
  const surveys = await prisma.survey.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      responseCount: true,
      maxRespondents: true,
      createdAt: true,
      _count: { select: { questions: true } },
    },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">설문 목록</h1>
          <p className="text-sm text-muted-foreground">
            업로드된 설문을 관리하고 응답 현황을 확인합니다.
          </p>
        </div>
        <Button nativeButton={false}
            render={<Link href="/staff/surveys/new" />}>
          <FileUp className="size-4" /> 새 설문 업로드
        </Button>
      </div>

      {surveys.length === 0 ? (
        <Card>
          <CardHeader className="items-center text-center">
            <CardTitle>아직 설문이 없습니다</CardTitle>
            <CardDescription>
              HWPX, DOCX 또는 PDF 설문 파일을 업로드하면 자동으로 웹 설문으로
              변환됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button nativeButton={false}
            render={<Link href="/staff/surveys/new" />}>
              <FileUp className="size-4" /> 설문 파일 업로드
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {surveys.map((survey) => {
            const status = STATUS_LABEL[survey.status] ?? STATUS_LABEL.DRAFT;
            return (
              <Link key={survey.id} href={`/staff/surveys/${survey.id}`}>
                <Card className="h-full transition-colors hover:border-primary/50">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-snug">
                        {survey.title}
                      </CardTitle>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <CardDescription>
                      문항 {survey._count.questions}개
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    응답 {survey.responseCount} / {survey.maxRespondents} ·{" "}
                    {new Date(survey.createdAt).toLocaleDateString("ko-KR")}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

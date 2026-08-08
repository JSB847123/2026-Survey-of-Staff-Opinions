import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getStaffSession } from "@/lib/session";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "감사 로그" };
export const dynamic = "force-dynamic";

const ACTION_LABELS: Record<string, string> = {
  "staff.login": "운영자 로그인",
  "survey.upload": "설문 업로드",
  "survey.update_meta": "설문 정보 수정",
  "survey.update_questions": "문항 수정",
  "survey.publish": "설문 게시",
  "survey.unpublish": "게시 중지",
  "survey.close": "설문 종료",
  "survey.delete": "설문 삭제",
  "survey.reset_responses": "응답 초기화",
  "respondent.create": "응답자 계정 생성",
  "respondent.update": "응답자 계정 변경",
  "respondent.password_change": "응답자 비밀번호 변경",
  "respondent.delete": "응답자 계정 삭제",
  "analysis.run": "AI 분석 실행",
  "analysis.reset": "AI 분석 기록 초기화",
  "settings.max_respondents": "최대 인원 변경",
  "settings.ai_key_set": "AI API 키 설정",
  "settings.ai_key_clear": "AI API 키 삭제",
  "respondent.signup": "응답자 회원 가입",
};

export default async function AuditPage() {
  const session = await getStaffSession();
  if (!session || session.role !== "admin") {
    redirect("/staff");
  }

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">감사 로그</h1>
        <p className="text-sm text-muted-foreground">
          운영자의 주요 작업 기록입니다. (최근 200건)
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">작업 기록</CardTitle>
          <CardDescription>관리자만 볼 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">기록이 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>시각</TableHead>
                  <TableHead>역할</TableHead>
                  <TableHead>작업</TableHead>
                  <TableHead>대상</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {log.createdAt.toLocaleString("ko-KR")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          log.actorRole === "admin"
                            ? "default"
                            : log.actorRole === "reviewer"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {log.actorRole === "admin"
                          ? "관리자"
                          : log.actorRole === "reviewer"
                            ? "확인자"
                            : "응답자"}
                      </Badge>
                    </TableCell>
                    <TableCell>{ACTION_LABELS[log.action] ?? log.action}</TableCell>
                    <TableCell className="max-w-48 truncate font-mono text-xs text-muted-foreground">
                      {log.targetType ? `${log.targetType}:${log.targetId}` : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

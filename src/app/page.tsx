import Link from "next/link";
import { ClipboardList, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <span className="text-sm font-semibold tracking-tight">
          2026 직원 의견 설문조사
        </span>
        <ThemeToggle />
      </header>
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-3xl space-y-8">
          <div className="space-y-3 text-center">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              2026 직원 의견 설문조사
            </h1>
            <p className="text-muted-foreground">
              여러분의 의견이 더 나은 조직을 만듭니다.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <ClipboardList className="size-8 text-primary" aria-hidden />
                <CardTitle>설문 응답</CardTitle>
                <CardDescription>
                  회원 가입 후 로그인하면 진행 중인 설문조사에 참여할 수
                  있습니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" nativeButton={false}
            render={<Link href="/respondent" />}>
                  설문 응답 시작
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <ShieldCheck className="size-8 text-primary" aria-hidden />
                <CardTitle>운영자</CardTitle>
                <CardDescription>
                  관리자 또는 확인자 Access Code로 로그인하여 설문을 관리합니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  nativeButton={false}
            render={<Link href="/staff/login" />}
                >
                  운영자 로그인
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}

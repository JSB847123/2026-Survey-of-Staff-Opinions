import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList, LogIn, UserRoundPlus } from "lucide-react";
import { getSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = { title: "설문 응답" };
export const dynamic = "force-dynamic";

export default async function RespondentEntryPage() {
  const session = await getSession();
  if (session?.kind === "respondent") {
    redirect("/respondent/surveys");
  }

  return (
    <main className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          2026 직원 의견 설문조사
        </Link>
        <ThemeToggle />
      </header>
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <ClipboardList className="mx-auto size-10 text-primary" aria-hidden />
            <CardTitle>설문 응답</CardTitle>
            <CardDescription>
              처음이라면 회원 가입 후, 계정이 있다면 로그인해 주세요.
              <br />
              ID와 비밀번호는 각각 숫자 4자리입니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="h-11 w-full"
              nativeButton={false}
            render={<Link href="/respondent/signup" />}
            >
              <UserRoundPlus className="size-4" /> 회원 가입
            </Button>
            <Button
              variant="outline"
              className="h-11 w-full"
              nativeButton={false}
            render={<Link href="/respondent/login" />}
            >
              <LogIn className="size-4" /> 로그인
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Loader2, LogIn, UserRoundPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/client-api";

const FOUR_DIGITS = /^\d{4}$/;

/** open redirect 방지: 내부 경로만 허용 */
function safeNext(next: string | null): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/respondent/surveys";
}

export function RespondentAuthForm({ mode }: { mode: "signup" | "login" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!FOUR_DIGITS.test(loginId)) {
      toast.error("아이디는 숫자 4자리입니다.");
      return;
    }
    if (!FOUR_DIGITS.test(password)) {
      toast.error("비밀번호는 숫자 4자리입니다.");
      return;
    }
    setLoading(true);
    try {
      await apiFetch(
        isSignup ? "/api/respondent/signup" : "/api/respondent/login",
        {
          method: "POST",
          body: JSON.stringify({ loginId, password }),
        },
      );
      if (isSignup) {
        toast.success("회원 가입이 완료되었습니다.");
      }
      router.push(safeNext(searchParams.get("next")));
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : isSignup
            ? "회원 가입에 실패했습니다."
            : "로그인에 실패했습니다.",
      );
      setLoading(false);
    }
  };

  const nextQuery = searchParams.get("next")
    ? `?next=${encodeURIComponent(safeNext(searchParams.get("next")))}`
    : "";

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        {isSignup ? (
          <UserRoundPlus className="mx-auto size-10 text-primary" aria-hidden />
        ) : (
          <LogIn className="mx-auto size-10 text-primary" aria-hidden />
        )}
        <CardTitle>{isSignup ? "회원 가입" : "로그인"}</CardTitle>
        <CardDescription>
          아이디와 비밀번호는 각각 숫자 4자리입니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="auth-id">아이디 (숫자 4자리)</Label>
            <Input
              id="auth-id"
              inputMode="numeric"
              autoComplete="username"
              maxLength={4}
              value={loginId}
              onChange={(e) => setLoginId(e.target.value.replace(/\D/g, ""))}
              placeholder="0000"
              disabled={loading}
              className="h-11 text-center text-lg tracking-[0.5em]"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="auth-pw">비밀번호 (숫자 4자리)</Label>
            <Input
              id="auth-pw"
              type="password"
              inputMode="numeric"
              autoComplete={isSignup ? "new-password" : "current-password"}
              maxLength={4}
              value={password}
              onChange={(e) => setPassword(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              disabled={loading}
              className="h-11 text-center text-lg tracking-[0.5em]"
            />
          </div>
          <Button type="submit" className="h-11 w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" /> 처리 중...
              </>
            ) : isSignup ? (
              "회원 가입"
            ) : (
              "로그인"
            )}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {isSignup ? (
            <>
              이미 계정이 있나요?{" "}
              <Link
                href={`/respondent/login${nextQuery}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                로그인
              </Link>
            </>
          ) : (
            <>
              계정이 없나요?{" "}
              <Link
                href={`/respondent/signup${nextQuery}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                회원 가입
              </Link>
            </>
          )}
        </p>
      </CardContent>
    </Card>
  );
}

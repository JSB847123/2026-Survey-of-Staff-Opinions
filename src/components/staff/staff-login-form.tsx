"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Loader2, ShieldCheck, UserRoundCog } from "lucide-react";
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

type StaffRole = "admin" | "reviewer";

const ROLE_LABEL: Record<StaffRole, string> = {
  admin: "관리자",
  reviewer: "확인자",
};

/** open redirect 방지: 운영자 화면 내부 경로만 허용 */
function safeNext(next: string | null): string {
  if (next && next.startsWith("/staff") && !next.startsWith("//")) {
    return next;
  }
  return "/staff";
}

export function StaffLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [role, setRole] = useState<StaffRole | null>(null);
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;
    if (!accessCode.trim()) {
      toast.error("Access Code를 입력해 주세요.");
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/api/staff/login", {
        method: "POST",
        body: JSON.stringify({ accessCode: accessCode.trim(), role }),
      });
      // 로그인 전에 보려던 화면이 있으면 그곳으로 돌아간다.
      router.push(safeNext(searchParams.get("next")));
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "로그인에 실패했습니다.",
      );
      setLoading(false);
    }
  };

  if (!role) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <ShieldCheck className="mx-auto size-10 text-primary" aria-hidden />
          <CardTitle>운영자 로그인</CardTitle>
          <CardDescription>로그인할 역할을 선택해 주세요.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="h-11 w-full" onClick={() => setRole("admin")}>
            <ShieldCheck className="size-4" /> 관리자 로그인
          </Button>
          <Button
            variant="outline"
            className="h-11 w-full"
            onClick={() => setRole("reviewer")}
          >
            <UserRoundCog className="size-4" /> 확인자 로그인
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        {role === "admin" ? (
          <ShieldCheck className="mx-auto size-10 text-primary" aria-hidden />
        ) : (
          <UserRoundCog className="mx-auto size-10 text-primary" aria-hidden />
        )}
        <CardTitle>{ROLE_LABEL[role]} 로그인</CardTitle>
        <CardDescription>
          {ROLE_LABEL[role]} Access Code를 입력해 주세요.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="access-code">Access Code</Label>
            <Input
              id="access-code"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Access Code 입력"
              disabled={loading}
              autoFocus
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" /> 확인 중...
              </>
            ) : (
              "로그인"
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={loading}
            onClick={() => {
              setRole(null);
              setAccessCode("");
            }}
          >
            <ArrowLeft className="size-4" /> 역할 다시 선택
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

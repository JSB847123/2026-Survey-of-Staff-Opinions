"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/client-api";

const FOUR_DIGITS = /^\d{4}$/;

export function RespondentLoginForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!FOUR_DIGITS.test(loginId)) {
      toast.error("ID는 숫자 4자리입니다.");
      return;
    }
    if (!FOUR_DIGITS.test(password)) {
      toast.error("비밀번호는 숫자 4자리입니다.");
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/api/respondent/login", {
        method: "POST",
        body: JSON.stringify({ slug, loginId, password }),
      });
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "로그인에 실패했습니다.",
      );
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="respondent-id">ID (숫자 4자리)</Label>
            <Input
              id="respondent-id"
              inputMode="numeric"
              autoComplete="username"
              maxLength={4}
              value={loginId}
              onChange={(e) => setLoginId(e.target.value.replace(/\D/g, ""))}
              placeholder="0000"
              disabled={loading}
              className="h-11 text-center text-lg tracking-[0.5em]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="respondent-pw">비밀번호 (숫자 4자리)</Label>
            <Input
              id="respondent-pw"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
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
                <Loader2 className="size-4 animate-spin" /> 확인 중...
              </>
            ) : (
              <>
                <LogIn className="size-4" /> 로그인
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

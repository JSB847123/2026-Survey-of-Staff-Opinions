"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Save, UsersRound } from "lucide-react";
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
import { MAX_RESPONDENT_LIMIT, MIN_RESPONDENT_LIMIT } from "@/lib/constants";

/** 최대 인원(1~20명) 설정 — 관리자와 확인자 모두 변경 가능 */
export function RespondentLimitCard({
  current,
  accountCount,
}: {
  current: number;
  accountCount: number;
}) {
  const router = useRouter();
  const [value, setValue] = useState(String(current));
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(value);
    if (
      !Number.isInteger(parsed) ||
      parsed < MIN_RESPONDENT_LIMIT ||
      parsed > MAX_RESPONDENT_LIMIT
    ) {
      toast.error(
        `최대 인원은 ${MIN_RESPONDENT_LIMIT}명 이상 ${MAX_RESPONDENT_LIMIT}명 이하로 입력해 주세요.`,
      );
      return;
    }
    setSaving(true);
    try {
      const result = await apiFetch<{ maxRespondents: number }>(
        "/api/settings",
        {
          method: "PATCH",
          body: JSON.stringify({ maxRespondents: parsed }),
        },
      );
      toast.success(`최대 인원을 ${result.maxRespondents}명으로 변경했습니다.`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "변경에 실패했습니다.");
      setValue(String(current));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UsersRound className="size-4" aria-hidden /> 최대 인원 설정
        </CardTitle>
        <CardDescription>
          응답자 계정 개수와 설문별 응답 인원의 상한입니다.{" "}
          {MIN_RESPONDENT_LIMIT}~{MAX_RESPONDENT_LIMIT}명 사이로 설정할 수
          있으며, 변경하면 모든 설문에 즉시 적용됩니다. (현재 계정{" "}
          {accountCount}개)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* 브라우저 기본 검증 대신 한국어 안내 메시지를 사용한다 */}
        <form
          onSubmit={save}
          noValidate
          className="flex flex-wrap items-end gap-3"
        >
          <div className="space-y-2">
            <Label htmlFor="max-respondents">최대 인원</Label>
            <div className="flex items-center gap-2">
              <Input
                id="max-respondents"
                type="number"
                inputMode="numeric"
                min={MIN_RESPONDENT_LIMIT}
                max={MAX_RESPONDENT_LIMIT}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-24 text-center"
                disabled={saving}
              />
              <span className="text-sm text-muted-foreground">명</span>
            </div>
          </div>
          <Button type="submit" disabled={saving || value === String(current)}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            저장
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

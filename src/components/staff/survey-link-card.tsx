"use client";

import { useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";
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

export function SurveyLinkCard({
  slug,
  status,
}: {
  slug: string;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
}) {
  const [copied, setCopied] = useState(false);
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/s/${slug}`
      : `/s/${slug}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("설문 링크를 복사했습니다.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("복사에 실패했습니다. 직접 선택하여 복사해 주세요.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="size-4" aria-hidden /> 응답자 설문 링크
        </CardTitle>
        <CardDescription>
          {status === "PUBLISHED"
            ? "이 링크를 응답자에게 공유하세요."
            : "설문을 게시하면 응답자가 이 링크로 접속할 수 있습니다."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex gap-2">
        <Input value={url} readOnly aria-label="설문 링크" />
        <Button variant="outline" size="icon" onClick={copy} aria-label="링크 복사">
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </Button>
      </CardContent>
    </Card>
  );
}

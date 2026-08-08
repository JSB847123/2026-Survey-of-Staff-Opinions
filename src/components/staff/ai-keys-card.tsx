"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, KeyRound, Loader2, Save, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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

type AiProviderId = "openai" | "deepseek";

export type AiKeyStatusDto = {
  provider: AiProviderId;
  configured: boolean;
  source: string;
  masked: string | null;
};

const PROVIDER_INFO: Record<
  AiProviderId,
  { label: string; model: string; hint: string }
> = {
  openai: {
    label: "OpenAI",
    model: "gpt-5.6-luna",
    hint: "platform.openai.com에서 발급한 API 키",
  },
  deepseek: {
    label: "DeepSeek",
    model: "deepseek-v4-flash",
    hint: "platform.deepseek.com에서 발급한 API 키",
  },
};

function ProviderRow({
  status,
  onSaved,
}: {
  status: AiKeyStatusDto;
  onSaved: (keys: AiKeyStatusDto[]) => void;
}) {
  const info = PROVIDER_INFO[status.provider];
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (apiKey: string | null) => {
    setSaving(true);
    try {
      const result = await apiFetch<{ keys: AiKeyStatusDto[] }>(
        "/api/settings/ai-keys",
        {
          method: "PUT",
          body: JSON.stringify({ provider: status.provider, apiKey }),
        },
      );
      onSaved(result.keys);
      setValue("");
      toast.success(
        apiKey
          ? `${info.label} API 키를 저장했습니다.`
          : `${info.label} API 키를 삭제했습니다.`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-0.5">
          <p className="font-medium">
            {info.label}{" "}
            <span className="font-mono text-xs text-muted-foreground">
              {info.model}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">{info.hint}</p>
        </div>
        {status.configured ? (
          <Badge variant="secondary" className="gap-1">
            <CheckCircle2 className="size-3" /> 설정됨 ({status.source})
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1 text-destructive">
            <XCircle className="size-3" /> 미설정
          </Badge>
        )}
      </div>

      {status.masked && (
        <p className="font-mono text-xs text-muted-foreground">
          현재 키: {status.masked}
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!value.trim()) {
            toast.error("API 키를 입력해 주세요.");
            return;
          }
          submit(value.trim());
        }}
        className="flex flex-wrap items-end gap-2"
      >
        <div className="min-w-56 flex-1 space-y-2">
          <Label htmlFor={`key-${status.provider}`}>
            {status.configured ? "새 API 키로 교체" : "API 키 입력"}
          </Label>
          <Input
            id={`key-${status.provider}`}
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={status.provider === "openai" ? "sk-..." : "sk-..."}
            disabled={saving}
          />
        </div>
        <Button type="submit" disabled={saving || !value.trim()}>
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          저장
        </Button>
        {status.source === "설정 화면" && (
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => submit(null)}
          >
            <Trash2 className="size-4" /> 삭제
          </Button>
        )}
      </form>
    </div>
  );
}

export function AiKeysCard({
  initialKeys,
}: {
  initialKeys: AiKeyStatusDto[];
}) {
  const router = useRouter();
  const [keys, setKeys] = useState(initialKeys);

  const handleSaved = (next: AiKeyStatusDto[]) => {
    setKeys(next);
    router.refresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="size-4" aria-hidden /> AI API 키
        </CardTitle>
        <CardDescription>
          여기에 키를 입력하면 AI 분석 기능을 바로 사용할 수 있습니다. 키는
          암호화되어 저장되며 화면에 다시 표시되지 않습니다. 환경변수로 설정된
          키가 있으면 입력한 키가 우선 적용됩니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {keys.map((status) => (
          <ProviderRow
            key={status.provider}
            status={status}
            onSaved={handleSaved}
          />
        ))}
      </CardContent>
    </Card>
  );
}

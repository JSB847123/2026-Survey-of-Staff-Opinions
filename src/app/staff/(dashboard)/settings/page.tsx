import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { getSession } from "@/lib/session";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "시스템 설정" };
export const dynamic = "force-dynamic";

function EnvStatus({ name, set }: { name: string; set: boolean }) {
  return (
    <li className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
      <span className="font-mono">{name}</span>
      {set ? (
        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-4" aria-hidden /> 설정됨
        </span>
      ) : (
        <span className="flex items-center gap-1 text-destructive">
          <XCircle className="size-4" aria-hidden /> 미설정
        </span>
      )}
    </li>
  );
}

export default async function SettingsPage() {
  const session = await getSession();
  if (!session || session.kind !== "staff" || session.role !== "admin") {
    redirect("/staff");
  }

  // 값 자체는 절대 노출하지 않고 설정 여부만 표시한다.
  const envs: [string, boolean][] = [
    ["DATABASE_URL", Boolean(process.env.DATABASE_URL)],
    ["DIRECT_URL", Boolean(process.env.DIRECT_URL)],
    ["NEXT_PUBLIC_SUPABASE_URL", Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)],
    [
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    ],
    [
      "SUPABASE_SERVICE_ROLE_KEY",
      Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    ],
    ["SUPABASE_STORAGE_BUCKET", Boolean(process.env.SUPABASE_STORAGE_BUCKET)],
    ["OPENAI_API_KEY", Boolean(process.env.OPENAI_API_KEY)],
    ["DEEPSEEK_API_KEY", Boolean(process.env.DEEPSEEK_API_KEY)],
    ["ADMIN_ACCESS_CODE", Boolean(process.env.ADMIN_ACCESS_CODE)],
    ["REVIEWER_ACCESS_CODE", Boolean(process.env.REVIEWER_ACCESS_CODE)],
    ["SESSION_SECRET", Boolean(process.env.SESSION_SECRET)],
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">시스템 설정</h1>
        <p className="text-sm text-muted-foreground">
          관리자 전용 화면입니다. 환경 구성 상태를 확인합니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">환경변수 상태</CardTitle>
          <CardDescription>
            보안을 위해 값은 표시하지 않으며 설정 여부만 확인할 수 있습니다.
            값 변경은 Vercel 프로젝트의 Environment Variables에서 하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {envs.map(([name, set]) => (
              <EnvStatus key={name} name={name} set={set} />
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">파일 저장소</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            드라이버:{" "}
            <span className="font-mono">
              {process.env.STORAGE_DRIVER ?? "supabase"}
            </span>
          </p>
          <p className="text-muted-foreground">
            production에서는 Supabase Private Storage(
            {process.env.SUPABASE_STORAGE_BUCKET ?? "survey-files"} 버킷)를
            사용합니다.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI 모델</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            OpenAI: <span className="font-mono">gpt-5.6-luna</span>
          </p>
          <p>
            DeepSeek: <span className="font-mono">deepseek-v4-flash</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

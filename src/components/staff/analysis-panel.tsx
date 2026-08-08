"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Loader2, RefreshCcw, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/client-api";

const PROVIDER_LABELS: Record<string, string> = {
  openai: "GPT-5.6 Luna",
  deepseek: "DeepSeek V4 Flash",
};

type AnalysisResult = {
  overallTrend: string;
  positives: string[];
  improvements: string[];
  keyChoiceFindings: string[];
  recurringThemes: string[];
  alignmentAndConflicts: string[];
  organizationalSignals: string[];
  actionableRecommendations: string[];
  interpretationCautions: string[];
};

export type AnalysisDto = {
  id: string;
  provider: string;
  model: string;
  resultJson: AnalysisResult;
  responseCount: number;
  surveyVersion: number;
  createdAt: string;
  createdByRole: string;
};

const SECTIONS: [keyof AnalysisResult, string][] = [
  ["overallTrend", "전체 응답 경향"],
  ["positives", "긍정적인 부분"],
  ["improvements", "개선이 필요한 부분"],
  ["keyChoiceFindings", "객관식 핵심 결과"],
  ["recurringThemes", "주관식 반복 테마"],
  ["alignmentAndConflicts", "객관식·주관식 일치/충돌"],
  ["organizationalSignals", "조직 운영상 주목할 신호"],
  ["actionableRecommendations", "실행 가능한 개선방안"],
  ["interpretationCautions", "해석 시 주의사항"],
];

function AnalysisResultView({ analysis }: { analysis: AnalysisDto }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="secondary">
          {PROVIDER_LABELS[analysis.provider] ?? analysis.provider}
        </Badge>
        <span>
          응답 {analysis.responseCount}명 기준 ·{" "}
          {new Date(analysis.createdAt).toLocaleString("ko-KR")}
        </span>
      </div>
      {SECTIONS.map(([key, title]) => {
        const value = analysis.resultJson[key];
        return (
          <section key={key} className="space-y-2">
            <h3 className="font-semibold">{title}</h3>
            {typeof value === "string" ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {value}
              </p>
            ) : Array.isArray(value) && value.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
                {value.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">(해당 없음)</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

export function AnalysisPanel({
  surveyId,
  surveyTitle,
  responseCount,
  initialAnalyses,
}: {
  surveyId: string;
  surveyTitle: string;
  responseCount: number;
  initialAnalyses: AnalysisDto[];
}) {
  const router = useRouter();
  const [analyses, setAnalyses] = useState<AnalysisDto[]>(initialAnalyses);
  const [running, setRunning] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<
    "all" | "openai" | "deepseek" | null
  >(null);
  const [resetting, setResetting] = useState(false);

  /** 분석 결과와 기록을 삭제한다. provider를 주면 해당 모델만 삭제. */
  const resetAnalyses = async (target: "all" | "openai" | "deepseek") => {
    setResetting(true);
    try {
      const query = target === "all" ? "" : `?provider=${target}`;
      const result = await apiFetch<{ deleted: number }>(
        `/api/surveys/${surveyId}/analysis${query}`,
        { method: "DELETE" },
      );
      setAnalyses((prev) =>
        target === "all" ? [] : prev.filter((a) => a.provider !== target),
      );
      toast.success(`분석 기록 ${result.deleted}건을 초기화했습니다.`);
      setResetTarget(null);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "초기화에 실패했습니다.",
      );
    } finally {
      setResetting(false);
    }
  };

  const latestByProvider = (provider: string): AnalysisDto | undefined =>
    analyses.find((a) => a.provider === provider);

  const run = async (provider: "openai" | "deepseek", force: boolean) => {
    setRunning(provider);
    try {
      const result = await apiFetch<{ analysis: AnalysisDto; cached: boolean }>(
        `/api/surveys/${surveyId}/analysis`,
        {
          method: "POST",
          body: JSON.stringify({ provider, force }),
        },
      );
      setAnalyses((prev) => [
        result.analysis,
        ...prev.filter((a) => a.id !== result.analysis.id),
      ]);
      toast.success(
        result.cached
          ? "저장된 최근 분석 결과를 불러왔습니다."
          : "AI 분석이 완료되었습니다.",
      );
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "분석에 실패했습니다.");
    } finally {
      setRunning(null);
    }
  };

  const openaiLatest = latestByProvider("openai");
  const deepseekLatest = latestByProvider("deepseek");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-1">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
            render={<Link href={`/staff/surveys/${surveyId}`} />}
        >
          <ArrowLeft className="size-4" /> 설문 현황으로 돌아가기
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">AI 설문 분석</h1>
        <p className="text-sm text-muted-foreground">
          {surveyTitle} · 현재 응답 {responseCount}명
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4" aria-hidden /> 분석 실행
          </CardTitle>
          <CardDescription>
            같은 응답 상태에 대한 최근 분석 결과가 있으면 재사용하고, [다시
            분석]을 누른 경우에만 AI를 다시 호출합니다. AI에는 익명화된 통계와
            주관식 응답만 전달됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            onClick={() => run("openai", false)}
            disabled={running !== null || responseCount === 0}
          >
            {running === "openai" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            GPT-5.6 Luna로 분석
          </Button>
          <Button
            onClick={() => run("deepseek", false)}
            disabled={running !== null || responseCount === 0}
          >
            {running === "deepseek" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            DeepSeek V4 Flash로 분석
          </Button>
          {openaiLatest && (
            <Button
              variant="outline"
              onClick={() => run("openai", true)}
              disabled={running !== null || responseCount === 0}
            >
              <RefreshCcw className="size-4" /> GPT 다시 분석
            </Button>
          )}
          {deepseekLatest && (
            <Button
              variant="outline"
              onClick={() => run("deepseek", true)}
              disabled={running !== null || responseCount === 0}
            >
              <RefreshCcw className="size-4" /> DeepSeek 다시 분석
            </Button>
          )}
          {responseCount === 0 && (
            <p className="text-sm text-muted-foreground">
              제출된 응답이 있어야 분석할 수 있습니다.
            </p>
          )}
        </CardContent>
      </Card>

      {(openaiLatest || deepseekLatest) && (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
            <CardTitle className="text-base">분석 결과</CardTitle>
            <div className="flex flex-wrap gap-2">
              {openaiLatest && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={resetting || running !== null}
                  onClick={() => setResetTarget("openai")}
                >
                  <Trash2 className="size-4" /> GPT 결과 삭제
                </Button>
              )}
              {deepseekLatest && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={resetting || running !== null}
                  onClick={() => setResetTarget("deepseek")}
                >
                  <Trash2 className="size-4" /> DeepSeek 결과 삭제
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs
              defaultValue={
                openaiLatest && deepseekLatest
                  ? "compare"
                  : openaiLatest
                    ? "openai"
                    : "deepseek"
              }
            >
              <TabsList>
                {openaiLatest && (
                  <TabsTrigger value="openai">GPT-5.6 Luna</TabsTrigger>
                )}
                {deepseekLatest && (
                  <TabsTrigger value="deepseek">DeepSeek V4 Flash</TabsTrigger>
                )}
                {openaiLatest && deepseekLatest && (
                  <TabsTrigger value="compare">두 모델 비교</TabsTrigger>
                )}
              </TabsList>
              {openaiLatest && (
                <TabsContent value="openai" className="pt-4">
                  <AnalysisResultView analysis={openaiLatest} />
                </TabsContent>
              )}
              {deepseekLatest && (
                <TabsContent value="deepseek" className="pt-4">
                  <AnalysisResultView analysis={deepseekLatest} />
                </TabsContent>
              )}
              {openaiLatest && deepseekLatest && (
                <TabsContent value="compare" className="pt-4">
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="min-w-0">
                      <AnalysisResultView analysis={openaiLatest} />
                    </div>
                    <div className="min-w-0 lg:border-l lg:pl-6">
                      <AnalysisResultView analysis={deepseekLatest} />
                    </div>
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {analyses.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
            <div className="space-y-1.5">
              <CardTitle className="text-base">분석 기록</CardTitle>
              <CardDescription>최근 20건까지 표시됩니다.</CardDescription>
            </div>
            <Button
              variant="destructive"
              size="sm"
              disabled={resetting || running !== null}
              onClick={() => setResetTarget("all")}
            >
              {resetting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              전체 초기화
            </Button>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analyses.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {PROVIDER_LABELS[a.provider] ?? a.provider}
                    </Badge>
                    응답 {a.responseCount}명 · v{a.surveyVersion}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(a.createdAt).toLocaleString("ko-KR")} ·{" "}
                    {a.createdByRole === "admin" ? "관리자" : "확인자"}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <AlertDialog
        open={resetTarget !== null}
        onOpenChange={(open) => !open && setResetTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {resetTarget === "all"
                ? "분석 결과와 기록을 모두 삭제할까요?"
                : `${resetTarget ? (PROVIDER_LABELS[resetTarget] ?? resetTarget) : ""} 분석 결과를 삭제할까요?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              저장된 분석 결과가 삭제되며 되돌릴 수 없습니다. 설문 응답 자체는
              삭제되지 않으며, 필요하면 언제든 다시 분석할 수 있습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>취소</AlertDialogCancel>
            <AlertDialogAction
              disabled={resetting}
              onClick={() => resetTarget && resetAnalyses(resetTarget)}
            >
              {resetting ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

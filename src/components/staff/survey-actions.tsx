"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Play, RotateCcw, Square, Trash2 } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apiFetch } from "@/lib/client-api";

export function SurveyActions({
  surveyId,
  status,
  isAdmin,
  questionCount,
}: {
  surveyId: string;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  isAdmin: boolean;
  questionCount: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const act = async (
    action: "publish" | "unpublish" | "close",
    successMessage: string,
  ) => {
    setLoading(action);
    try {
      await apiFetch(`/api/surveys/${surveyId}/publish`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      toast.success(successMessage);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "처리에 실패했습니다.");
    } finally {
      setLoading(null);
    }
  };

  const resetResponses = async () => {
    setLoading("reset");
    try {
      const result = await apiFetch<{ deleted: number }>(
        `/api/surveys/${surveyId}/reset-responses`,
        { method: "POST" },
      );
      toast.success(`응답 ${result.deleted}건을 초기화했습니다.`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "처리에 실패했습니다.");
    } finally {
      setLoading(null);
    }
  };

  const deleteSurvey = async () => {
    setLoading("delete");
    try {
      await apiFetch(`/api/surveys/${surveyId}`, { method: "DELETE" });
      toast.success("설문을 삭제했습니다.");
      router.push("/staff");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "삭제에 실패했습니다.");
      setLoading(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">설문 관리</CardTitle>
        <CardDescription>
          게시 상태를 변경하거나 응답을 관리합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {status !== "PUBLISHED" ? (
          <Button
            onClick={() => act("publish", "설문을 게시했습니다.")}
            disabled={loading !== null || questionCount === 0}
          >
            {loading === "publish" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Play className="size-4" />
            )}
            게시
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              onClick={() => act("unpublish", "설문 게시를 중지했습니다.")}
              disabled={loading !== null}
            >
              {loading === "unpublish" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Square className="size-4" />
              )}
              게시 중지
            </Button>
            <Button
              variant="outline"
              onClick={() => act("close", "설문을 종료했습니다.")}
              disabled={loading !== null}
            >
              <Square className="size-4" /> 설문 종료
            </Button>
          </>
        )}

        {isAdmin && (
          <>
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button variant="outline" disabled={loading !== null}>
                    <RotateCcw className="size-4" /> 응답 초기화
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>응답을 모두 초기화할까요?</AlertDialogTitle>
                  <AlertDialogDescription>
                    제출된 모든 응답이 삭제되며 되돌릴 수 없습니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction onClick={resetResponses}>
                    초기화
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button variant="destructive" disabled={loading !== null}>
                    <Trash2 className="size-4" /> 설문 삭제
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>설문을 삭제할까요?</AlertDialogTitle>
                  <AlertDialogDescription>
                    설문과 모든 문항, 응답자 계정, 응답이 함께 삭제되며 되돌릴
                    수 없습니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteSurvey}>
                    삭제
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </CardContent>
    </Card>
  );
}

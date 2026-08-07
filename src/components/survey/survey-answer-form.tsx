"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Send } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/client-api";
import type { SurveyDto } from "@/lib/survey-dto";

type AnswerState = {
  selectedOptionIds: string[];
  textValue: string;
};

export function SurveyAnswerForm({
  survey,
  mode,
}: {
  survey: SurveyDto;
  mode: "preview" | "live";
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const getAnswer = (questionId: string): AnswerState =>
    answers[questionId] ?? { selectedOptionIds: [], textValue: "" };

  const toggleOption = (questionId: string, optionId: string) => {
    setAnswers((prev) => {
      const current = prev[questionId] ?? { selectedOptionIds: [], textValue: "" };
      const has = current.selectedOptionIds.includes(optionId);
      return {
        ...prev,
        [questionId]: {
          ...current,
          selectedOptionIds: has
            ? current.selectedOptionIds.filter((id) => id !== optionId)
            : [...current.selectedOptionIds, optionId],
        },
      };
    });
  };

  const setText = (questionId: string, textValue: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] ?? { selectedOptionIds: [] }),
        selectedOptionIds: prev[questionId]?.selectedOptionIds ?? [],
        textValue,
      },
    }));
  };

  const validate = (): boolean => {
    for (const q of survey.questions) {
      if (!q.required) continue;
      const answer = getAnswer(q.id);
      if (q.type === "CHECKBOX" && answer.selectedOptionIds.length === 0) {
        toast.error(`필수 문항에 응답해 주세요: ${q.order}. ${q.title}`);
        document.getElementById(`question-${q.id}`)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        return false;
      }
      if (q.type !== "CHECKBOX" && answer.textValue.trim().length === 0) {
        toast.error(`필수 문항에 응답해 주세요: ${q.order}. ${q.title}`);
        document.getElementById(`question-${q.id}`)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        return false;
      }
    }
    return true;
  };

  const requestSubmit = () => {
    if (mode === "preview") {
      toast.info("미리보기 모드에서는 제출되지 않습니다.");
      return;
    }
    if (!validate()) return;
    setConfirmOpen(true);
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      await apiFetch("/api/respondent/submit", {
        method: "POST",
        body: JSON.stringify({
          surveyId: survey.id,
          answers: survey.questions.map((q) => {
            const answer = getAnswer(q.id);
            return {
              questionId: q.id,
              selectedOptionIds:
                q.type === "CHECKBOX" ? answer.selectedOptionIds : undefined,
              textValue: q.type !== "CHECKBOX" ? answer.textValue : undefined,
            };
          }),
        }),
      });
      router.push(`/s/${survey.slug}/done`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "제출에 실패했습니다.",
      );
      setSubmitting(false);
      setConfirmOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">{survey.title}</h1>
        {survey.description && (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {survey.description}
          </p>
        )}
        {mode === "preview" && (
          <Badge variant="secondary">미리보기 모드 — 제출되지 않습니다</Badge>
        )}
      </div>

      {survey.questions.map((q) => {
        const answer = getAnswer(q.id);
        return (
          <Card key={q.id} id={`question-${q.id}`}>
            <CardHeader>
              <CardTitle className="text-base leading-snug">
                {q.order}. {q.title}
                {q.required && (
                  <span className="ml-1 text-destructive" aria-label="필수 문항">
                    *
                  </span>
                )}
              </CardTitle>
              {q.description && (
                <CardDescription className="whitespace-pre-wrap">
                  {q.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {q.type === "CHECKBOX" ? (
                <ul className="space-y-1">
                  {q.options.map((o) => {
                    const checked = answer.selectedOptionIds.includes(o.id);
                    return (
                      <li key={o.id}>
                        <Label
                          htmlFor={`option-${o.id}`}
                          className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 py-2 font-normal transition-colors hover:bg-muted/50"
                        >
                          <Checkbox
                            id={`option-${o.id}`}
                            checked={checked}
                            onCheckedChange={() => toggleOption(q.id, o.id)}
                          />
                          <span>{o.label}</span>
                        </Label>
                      </li>
                    );
                  })}
                </ul>
              ) : q.type === "SHORT_TEXT" ? (
                <Input
                  value={answer.textValue}
                  onChange={(e) => setText(q.id, e.target.value)}
                  placeholder="답변을 입력해 주세요."
                  maxLength={500}
                  aria-label={`${q.order}번 문항 답변`}
                />
              ) : (
                <Textarea
                  value={answer.textValue}
                  onChange={(e) => setText(q.id, e.target.value)}
                  placeholder="의견을 자유롭게 작성해 주세요."
                  rows={5}
                  maxLength={5000}
                  aria-label={`${q.order}번 문항 답변`}
                />
              )}
            </CardContent>
          </Card>
        );
      })}

      <div className="flex justify-end pb-8">
        <Button size="lg" onClick={requestSubmit} disabled={submitting}>
          {submitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          제출하기
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>응답을 제출할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              응답을 제출하면 수정할 수 없습니다. 제출하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={submit} disabled={submitting}>
              {submitting ? "제출 중..." : "제출"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

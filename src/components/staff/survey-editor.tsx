"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Eye,
  Loader2,
  Plus,
  Save,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/client-api";
import {
  QUESTION_TYPE_LABEL,
  type SurveyDto,
  type SurveyQuestionDto,
} from "@/lib/survey-dto";

let tempIdCounter = 0;
const tempId = () => `new-${++tempIdCounter}`;

function isTempId(id: string) {
  return id.startsWith("new-");
}

export function SurveyEditor({ initialSurvey }: { initialSurvey: SurveyDto }) {
  const router = useRouter();
  const [title, setTitle] = useState(initialSurvey.title);
  const [description, setDescription] = useState(initialSurvey.description ?? "");
  const [questions, setQuestions] = useState<SurveyQuestionDto[]>(
    initialSurvey.questions,
  );
  const [saving, setSaving] = useState(false);

  const hasResponses = initialSurvey.responseCount > 0;

  const updateQuestion = (
    id: string,
    patch: Partial<SurveyQuestionDto>,
  ) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...patch } : q)),
    );
  };

  const moveQuestion = (index: number, dir: -1 | 1) => {
    setQuestions((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: tempId(),
        order: prev.length + 1,
        type: "CHECKBOX",
        title: "",
        description: null,
        required: false,
        needsReview: false,
        options: [
          { id: tempId(), order: 1, label: "" },
          { id: tempId(), order: 2, label: "" },
        ],
      },
    ]);
  };

  const removeQuestion = (id: string) => {
    if (hasResponses && !isTempId(id)) {
      toast.error("이미 응답이 존재하는 설문에서는 문항을 삭제할 수 없습니다.");
      return;
    }
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const addOption = (questionId: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: [
                ...q.options,
                { id: tempId(), order: q.options.length + 1, label: "" },
              ],
            }
          : q,
      ),
    );
  };

  const updateOption = (questionId: string, optionId: string, label: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: q.options.map((o) =>
                o.id === optionId ? { ...o, label } : o,
              ),
            }
          : q,
      ),
    );
  };

  const moveOption = (questionId: string, index: number, dir: -1 | 1) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q;
        const next = [...q.options];
        const target = index + dir;
        if (target < 0 || target >= next.length) return q;
        [next[index], next[target]] = [next[target], next[index]];
        return { ...q, options: next };
      }),
    );
  };

  const removeOption = (questionId: string, optionId: string) => {
    if (hasResponses && !isTempId(optionId)) {
      toast.error(
        "이미 응답이 존재하는 설문에서는 선택지를 삭제할 수 없습니다.",
      );
      return;
    }
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? { ...q, options: q.options.filter((o) => o.id !== optionId) }
          : q,
      ),
    );
  };

  const save = async () => {
    if (!title.trim()) {
      toast.error("설문 제목을 입력해 주세요.");
      return;
    }
    for (const [i, q] of questions.entries()) {
      if (!q.title.trim()) {
        toast.error(`${i + 1}번 문항의 제목을 입력해 주세요.`);
        return;
      }
      if (q.type === "CHECKBOX") {
        if (q.options.length === 0) {
          toast.error(`${i + 1}번 문항에 선택지를 추가해 주세요.`);
          return;
        }
        if (q.options.some((o) => !o.label.trim())) {
          toast.error(`${i + 1}번 문항에 비어 있는 선택지가 있습니다.`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      await apiFetch(`/api/surveys/${initialSurvey.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
        }),
      });
      await apiFetch(`/api/surveys/${initialSurvey.id}/questions`, {
        method: "PUT",
        body: JSON.stringify({
          questions: questions.map((q, qi) => ({
            id: isTempId(q.id) ? undefined : q.id,
            order: qi + 1,
            type: q.type,
            title: q.title.trim(),
            description: q.description?.trim() || null,
            required: q.required,
            needsReview: q.needsReview,
            options:
              q.type === "CHECKBOX"
                ? q.options.map((o, oi) => ({
                    id: isTempId(o.id) ? undefined : o.id,
                    order: oi + 1,
                    label: o.label.trim(),
                  }))
                : [],
          })),
        }),
      });
      toast.success("설문을 저장했습니다.");
      router.push(`/staff/surveys/${initialSurvey.id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "저장에 실패했습니다.");
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">설문 편집</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            render={<Link href={`/staff/surveys/${initialSurvey.id}/preview`} />}
          >
            <Eye className="size-4" /> 미리보기
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            저장
          </Button>
        </div>
      </div>

      {hasResponses && (
        <Alert>
          <TriangleAlert className="size-4" />
          <AlertTitle>응답이 이미 제출된 설문입니다</AlertTitle>
          <AlertDescription>
            기존 응답의 의미를 보호하기 위해 문항 삭제, 문항 유형 변경, 선택지
            삭제는 제한됩니다.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="survey-title">설문 제목</Label>
            <Input
              id="survey-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 2026 직원 의견 설문조사"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="survey-description">설문 설명 (선택)</Label>
            <Textarea
              id="survey-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="설문 목적이나 안내 문구를 입력하세요."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {questions.map((q, qi) => (
        <Card key={q.id} className={q.needsReview ? "border-amber-500/60" : undefined}>
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">문항 {qi + 1}</CardTitle>
              {q.needsReview && (
                <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400">
                  확인 필요
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {q.needsReview && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateQuestion(q.id, { needsReview: false })}
                >
                  <CheckCircle2 className="size-4" /> 확인 완료
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="위로 이동"
                onClick={() => moveQuestion(qi, -1)}
                disabled={qi === 0}
              >
                <ArrowUp className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="아래로 이동"
                onClick={() => moveQuestion(qi, 1)}
                disabled={qi === questions.length - 1}
              >
                <ArrowDown className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="문항 삭제"
                onClick={() => removeQuestion(q.id)}
                disabled={hasResponses && !isTempId(q.id)}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto]">
              <div className="space-y-2">
                <Label htmlFor={`q-title-${q.id}`}>문항 제목</Label>
                <Input
                  id={`q-title-${q.id}`}
                  value={q.title}
                  onChange={(e) => updateQuestion(q.id, { title: e.target.value })}
                  placeholder="문항 내용을 입력하세요."
                />
              </div>
              <div className="space-y-2">
                <Label>유형</Label>
                <Select
                  value={q.type}
                  onValueChange={(value) => {
                    if (hasResponses && !isTempId(q.id)) {
                      toast.error(
                        "이미 응답이 존재하는 설문에서는 문항 유형을 변경할 수 없습니다.",
                      );
                      return;
                    }
                    updateQuestion(q.id, {
                      type: value as SurveyQuestionDto["type"],
                    });
                  }}
                >
                  <SelectTrigger className="w-44" aria-label="문항 유형">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(QUESTION_TYPE_LABEL) as SurveyQuestionDto["type"][]).map(
                      (type) => (
                        <SelectItem key={type} value={type}>
                          {QUESTION_TYPE_LABEL[type]}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`q-required-${q.id}`}>필수</Label>
                <div className="flex h-8 items-center">
                  <Switch
                    id={`q-required-${q.id}`}
                    checked={q.required}
                    onCheckedChange={(checked) =>
                      updateQuestion(q.id, { required: Boolean(checked) })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`q-desc-${q.id}`}>보조 설명 (선택)</Label>
              <Input
                id={`q-desc-${q.id}`}
                value={q.description ?? ""}
                onChange={(e) =>
                  updateQuestion(q.id, { description: e.target.value || null })
                }
                placeholder="문항에 대한 추가 안내"
              />
            </div>

            {q.type === "CHECKBOX" && (
              <div className="space-y-2">
                <Label>선택지</Label>
                <ul className="space-y-2">
                  {q.options.map((o, oi) => (
                    <li key={o.id} className="flex items-center gap-1">
                      <Input
                        value={o.label}
                        onChange={(e) => updateOption(q.id, o.id, e.target.value)}
                        placeholder={`선택지 ${oi + 1}`}
                        aria-label={`문항 ${qi + 1} 선택지 ${oi + 1}`}
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="선택지 위로 이동"
                        onClick={() => moveOption(q.id, oi, -1)}
                        disabled={oi === 0}
                      >
                        <ArrowUp className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="선택지 아래로 이동"
                        onClick={() => moveOption(q.id, oi, 1)}
                        disabled={oi === q.options.length - 1}
                      >
                        <ArrowDown className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="선택지 삭제"
                        onClick={() => removeOption(q.id, o.id)}
                        disabled={hasResponses && !isTempId(o.id)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
                <Button variant="outline" size="sm" onClick={() => addOption(q.id)}>
                  <Plus className="size-4" /> 선택지 추가
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <Button variant="outline" className="w-full" onClick={addQuestion}>
        <Plus className="size-4" /> 문항 추가
      </Button>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          저장
        </Button>
      </div>
    </div>
  );
}

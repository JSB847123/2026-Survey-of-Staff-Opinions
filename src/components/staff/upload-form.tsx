"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { FileUp, Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/client-api";

// 500KB = 500 * 1024 bytes (서버에서도 동일하게 검증한다)
const MAX_FILE_SIZE = 500 * 1024;
const ACCEPTED_EXTENSIONS = [".hwpx", ".docx", ".pdf"];

type UploadResult = {
  surveyId: string;
  questionCount: number;
  warnings: string[];
};

export function UploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  const selectFile = (selected: File | null) => {
    setWarnings([]);
    if (!selected) {
      setFile(null);
      return;
    }
    const lower = selected.name.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
      toast.error(
        "지원하지 않는 파일 형식입니다. HWPX, DOCX, PDF 파일만 업로드할 수 있습니다.",
      );
      setFile(null);
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      toast.error("파일 크기는 최대 500KB까지 업로드할 수 있습니다.");
      setFile(null);
      return;
    }
    setFile(selected);
  };

  const upload = async () => {
    if (!file) {
      toast.error("업로드할 파일을 선택해 주세요.");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await apiFetch<UploadResult>("/api/surveys/upload", {
        method: "POST",
        body: formData,
      });
      toast.success(
        `문항 ${result.questionCount}개를 추출했습니다. 편집 화면에서 확인해 주세요.`,
      );
      if (result.warnings.length > 0) {
        setWarnings(result.warnings);
        // 경고가 있어도 편집 화면으로 이동은 가능하도록 잠시 보여준 뒤 이동
        setTimeout(() => {
          router.push(`/staff/surveys/${result.surveyId}/edit`);
        }, 1500);
      } else {
        router.push(`/staff/surveys/${result.surveyId}/edit`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "업로드에 실패했습니다.",
      );
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              selectFile(e.dataTransfer.files?.[0] ?? null);
            }}
            className="flex w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/25 px-6 py-12 text-center transition-colors hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-ring"
            aria-label="설문 파일 선택"
            disabled={loading}
          >
            <FileUp className="size-10 text-muted-foreground" aria-hidden />
            {file ? (
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024).toFixed(1)}KB
                </p>
              </div>
            ) : (
              <div>
                <p className="font-medium">
                  파일을 끌어다 놓거나 클릭하여 선택
                </p>
                <p className="text-sm text-muted-foreground">
                  HWPX · DOCX · PDF, 최대 500KB
                </p>
              </div>
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".hwpx,.docx,.pdf"
            className="sr-only"
            onChange={(e) => selectFile(e.target.files?.[0] ?? null)}
            aria-hidden
            tabIndex={-1}
          />
          <Button onClick={upload} disabled={!file || loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" /> 문항 추출 중...
              </>
            ) : (
              "업로드 및 문항 추출"
            )}
          </Button>
        </CardContent>
      </Card>

      {warnings.length > 0 && (
        <Alert>
          <TriangleAlert className="size-4" />
          <AlertTitle>확인이 필요한 항목이 있습니다</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

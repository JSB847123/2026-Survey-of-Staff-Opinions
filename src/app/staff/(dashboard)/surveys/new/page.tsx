import type { Metadata } from "next";
import { UploadForm } from "@/components/staff/upload-form";

export const metadata: Metadata = { title: "설문 업로드" };

export default function NewSurveyPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">설문 파일 업로드</h1>
        <p className="text-sm text-muted-foreground">
          HWPX, DOCX, PDF 파일을 업로드하면 문항을 자동으로 추출해 초안(Draft)
          설문을 만듭니다. 업로드 후 편집 화면에서 확인·수정한 뒤 게시할 수
          있습니다.
        </p>
      </div>
      <UploadForm />
    </div>
  );
}

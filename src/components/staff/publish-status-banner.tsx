import Link from "next/link";
import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * 설문이 응답자에게 보이는 상태인지, 보이지 않는다면 무엇을 해야 하는지 안내한다.
 * (게시하지 않으면 응답자 목록에 나타나지 않는다는 점이 가장 혼동되는 부분)
 */
export function PublishStatusBanner({
  surveyId,
  status,
  questionCount,
  needsReviewCount,
}: {
  surveyId: string;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  questionCount: number;
  needsReviewCount: number;
}) {
  if (status === "PUBLISHED") {
    return (
      <Alert>
        <CircleCheck className="size-4 text-emerald-500" />
        <AlertTitle>게시 중 — 응답자에게 표시됩니다</AlertTitle>
        <AlertDescription>
          응답자가 로그인하면 설문 목록에서 이 설문에 참여할 수 있습니다.
        </AlertDescription>
      </Alert>
    );
  }

  if (status === "CLOSED") {
    return (
      <Alert>
        <CircleAlert className="size-4" />
        <AlertTitle>종료됨 — 응답자에게 표시되지 않습니다</AlertTitle>
        <AlertDescription>
          다시 응답을 받으려면 아래 [게시] 버튼을 눌러 주세요.
        </AlertDescription>
      </Alert>
    );
  }

  // DRAFT
  const blockers: string[] = [];
  if (questionCount === 0) {
    blockers.push("문항이 없습니다. 편집 화면에서 문항을 추가해 주세요.");
  }
  if (needsReviewCount > 0) {
    blockers.push(
      `'확인 필요' 상태의 문항이 ${needsReviewCount}개 있습니다. 편집 화면에서 내용을 확인한 뒤 [확인 완료]를 눌러 주세요.`,
    );
  }

  return (
    <Alert variant="destructive">
      <TriangleAlert className="size-4" />
      <AlertTitle>
        아직 게시되지 않았습니다 — 응답자에게 보이지 않습니다
      </AlertTitle>
      <AlertDescription className="space-y-3">
        {blockers.length > 0 ? (
          <>
            <p>게시하려면 먼저 아래 항목을 처리해 주세요.</p>
            <ul className="list-disc space-y-1 pl-4">
              {blockers.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={<Link href={`/staff/surveys/${surveyId}/edit`} />}
            >
              편집 화면으로 이동
            </Button>
          </>
        ) : (
          <p>
            아래 [게시] 버튼을 누르면 응답자가 설문에 참여할 수 있습니다.
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}

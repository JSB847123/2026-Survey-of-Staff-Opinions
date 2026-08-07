import type { QuestionStat } from "@/lib/stats";
import { QUESTION_TYPE_LABEL } from "@/lib/survey-dto";
import { Badge } from "@/components/ui/badge";

/** 객관식 선택지별 응답 인원/비율 막대 차트 (서버 계산 값 표시 전용) */
export function StatsBars({
  questions,
  submittedCount,
}: {
  questions: QuestionStat[];
  submittedCount: number;
}) {
  if (questions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">등록된 문항이 없습니다.</p>
    );
  }

  return (
    <div className="space-y-8">
      {questions.map((q) => (
        <div key={q.questionId} className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">
              {q.order}. {q.title}
            </span>
            <Badge variant="outline">
              {QUESTION_TYPE_LABEL[q.type as keyof typeof QUESTION_TYPE_LABEL] ??
                q.type}
            </Badge>
          </div>

          {q.type === "CHECKBOX" ? (
            <ul className="space-y-2">
              {q.options.map((o) => (
                <li key={o.optionId} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span>{o.label}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {o.count}명 ({o.percentage}%)
                    </span>
                  </div>
                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-muted"
                    role="img"
                    aria-label={`${o.label}: ${o.count}명, ${o.percentage}%`}
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.min(100, o.percentage)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : q.textAnswers.length > 0 ? (
            <ul className="space-y-2">
              {q.textAnswers.map((answer, i) => (
                <li
                  key={i}
                  className="rounded-md border bg-muted/30 px-3 py-2 text-sm whitespace-pre-wrap"
                >
                  {answer}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              {submittedCount === 0
                ? "아직 제출된 응답이 없습니다."
                : "작성된 주관식 응답이 없습니다."}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

import "server-only";
import { prisma } from "./db";

export type OptionStat = {
  optionId: string;
  label: string;
  count: number;
  /** 응답 제출 인원 대비 비율 (%) — 소수점 1자리 */
  percentage: number;
};

export type QuestionStat = {
  questionId: string;
  order: number;
  type: string;
  title: string;
  options: OptionStat[];
  textAnswers: string[];
};

export type SurveyStats = {
  respondentTotal: number;
  submittedCount: number;
  notSubmittedCount: number;
  responseRate: number;
  maxRespondents: number;
  questions: QuestionStat[];
};

/**
 * 객관식 통계는 AI가 아니라 서버에서 정확하게 계산한다.
 * 표본이 최대 13명이므로 메모리 집계로 충분하다.
 */
export async function computeSurveyStats(surveyId: string): Promise<SurveyStats> {
  const [survey, accounts, notSubmittedAccounts, questions, responses] =
    await Promise.all([
      prisma.survey.findUniqueOrThrow({ where: { id: surveyId } }),
      // 응답자 계정은 전역이므로 활성 계정 전체가 이 설문의 참여 대상이다.
      prisma.respondentAccount.count({ where: { active: true } }),
      // 미제출은 뺄셈이 아니라 '아직 이 설문에 응답하지 않은 활성 계정'을 직접 센다.
      // (비활성 계정이 이미 제출한 경우에도 숫자가 어긋나지 않는다.)
      prisma.respondentAccount.count({
        where: { active: true, responses: { none: { surveyId } } },
      }),
      prisma.question.findMany({
        where: { surveyId },
        orderBy: { order: "asc" },
        include: { options: { orderBy: { order: "asc" } } },
      }),
      prisma.surveyResponse.findMany({
        where: { surveyId },
        include: {
          answers: { include: { selections: true } },
        },
      }),
    ]);

  const submittedCount = responses.length;
  const denominator = submittedCount > 0 ? submittedCount : 1;

  const questionStats: QuestionStat[] = questions.map((q) => {
    const answersForQuestion = responses
      .flatMap((r) => r.answers)
      .filter((a) => a.questionId === q.id);

    const optionCounts = new Map<string, number>();
    for (const answer of answersForQuestion) {
      for (const sel of answer.selections) {
        optionCounts.set(sel.optionId, (optionCounts.get(sel.optionId) ?? 0) + 1);
      }
    }

    const options: OptionStat[] = q.options.map((o) => {
      const count = optionCounts.get(o.id) ?? 0;
      return {
        optionId: o.id,
        label: o.label,
        count,
        percentage: Math.round((count / denominator) * 1000) / 10,
      };
    });

    // 체크박스 문항도 '기타' 선택 시 직접 입력한 단답이 있으므로 함께 모은다.
    const textAnswers = answersForQuestion
      .map((a) => (a.textValue ?? "").trim())
      .filter((t) => t.length > 0);

    return {
      questionId: q.id,
      order: q.order,
      type: q.type,
      title: q.title,
      options,
      textAnswers,
    };
  });

  // 응답률 분모는 '제출한 사람 + 아직 제출하지 않은 참여 대상'으로,
  // 화면의 제출/미제출 숫자와 항상 일관되게 맞춘다.
  const rateBase = submittedCount + notSubmittedAccounts;

  return {
    respondentTotal: accounts,
    submittedCount,
    notSubmittedCount: notSubmittedAccounts,
    responseRate:
      rateBase > 0 ? Math.round((submittedCount / rateBase) * 1000) / 10 : 0,
    maxRespondents: survey.maxRespondents,
    questions: questionStats,
  };
}

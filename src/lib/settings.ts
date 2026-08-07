import "server-only";
import { prisma } from "./db";
import { AppError } from "./errors";
import {
  DEFAULT_MAX_RESPONDENTS,
  MAX_RESPONDENT_LIMIT,
  MIN_RESPONDENT_LIMIT,
} from "./constants";

const SINGLETON_ID = "singleton";

/** 전역 최대 인원 설정을 읽는다. 행이 없으면 기본값으로 생성한다. */
export async function getMaxRespondents(): Promise<number> {
  const setting = await prisma.appSetting.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, maxRespondents: DEFAULT_MAX_RESPONDENTS },
    update: {},
  });
  return setting.maxRespondents;
}

/**
 * 전역 최대 인원을 변경한다.
 * 이미 제출된 응답 수보다 작게 줄이면 기존 응답이 정원을 초과하게 되므로 거부하고,
 * 모든 설문의 maxRespondents도 함께 갱신한다.
 */
export async function setMaxRespondents(limit: number): Promise<number> {
  if (
    !Number.isInteger(limit) ||
    limit < MIN_RESPONDENT_LIMIT ||
    limit > MAX_RESPONDENT_LIMIT
  ) {
    throw new AppError(
      400,
      `최대 인원은 ${MIN_RESPONDENT_LIMIT}명 이상 ${MAX_RESPONDENT_LIMIT}명 이하로 설정할 수 있습니다.`,
    );
  }

  return prisma.$transaction(async (tx) => {
    const busiest = await tx.survey.findFirst({
      orderBy: { responseCount: "desc" },
      select: { title: true, responseCount: true },
    });
    if (busiest && busiest.responseCount > limit) {
      throw new AppError(
        409,
        `'${busiest.title}' 설문에 이미 ${busiest.responseCount}명이 응답해 최대 인원을 ${limit}명으로 줄일 수 없습니다.`,
      );
    }

    const accountCount = await tx.respondentAccount.count();
    if (accountCount > limit) {
      throw new AppError(
        409,
        `이미 응답자 계정이 ${accountCount}개 있어 최대 인원을 ${limit}명으로 줄일 수 없습니다. 계정을 먼저 정리해 주세요.`,
      );
    }

    const setting = await tx.appSetting.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, maxRespondents: limit },
      update: { maxRespondents: limit },
    });

    // 기존 설문에도 즉시 반영한다.
    await tx.survey.updateMany({ data: { maxRespondents: limit } });

    return setting.maxRespondents;
  });
}

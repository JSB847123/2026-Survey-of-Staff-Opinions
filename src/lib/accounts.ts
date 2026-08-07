import "server-only";
import { Prisma, type PrismaClient } from "@prisma/client";
import { AppError } from "./errors";
import { accountLimitMessage, DEFAULT_MAX_RESPONDENTS } from "./constants";

const SINGLETON_ID = "singleton";

/**
 * 응답자 계정 생성 (회원가입/관리자 생성 공용).
 * 트랜잭션 안에서 전역 설정(최대 인원)과 현재 계정 수를 확인해 상한을 넘지 않도록 하고,
 * unique(loginId) 제약으로 중복 ID를 차단한다.
 */
export async function createRespondentAccount(
  db: PrismaClient,
  loginId: string,
  passwordHash: string,
): Promise<{ id: string; loginId: string }> {
  try {
    return await db.$transaction(
      async (tx) => {
        const setting = await tx.appSetting.findUnique({
          where: { id: SINGLETON_ID },
        });
        const limit = setting?.maxRespondents ?? DEFAULT_MAX_RESPONDENTS;

        const count = await tx.respondentAccount.count();
        if (count >= limit) {
          throw new AppError(409, accountLimitMessage(limit));
        }
        return tx.respondentAccount.create({
          data: { loginId, passwordHash },
          select: { id: true, loginId: true },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError(409, "이미 사용 중인 ID입니다.");
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      // 직렬화 충돌 — 동시 가입 경쟁에서 밀린 경우
      throw new AppError(409, "잠시 후 다시 시도해 주세요.");
    }
    throw error;
  }
}

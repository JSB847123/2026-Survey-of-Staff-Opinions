import "server-only";
import { Prisma, type PrismaClient } from "@prisma/client";
import { AppError } from "./errors";
import { ACCOUNT_LIMIT_MESSAGE, MAX_RESPONDENT_ACCOUNTS } from "./constants";

/**
 * 응답자 계정 생성 (회원가입/관리자 생성 공용).
 * 트랜잭션 안에서 전체 계정 수를 확인해 최대 13개를 넘지 않도록 하고,
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
        const count = await tx.respondentAccount.count();
        if (count >= MAX_RESPONDENT_ACCOUNTS) {
          throw new AppError(409, ACCOUNT_LIMIT_MESSAGE);
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

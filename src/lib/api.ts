import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./errors";

type Handler<T> = () => Promise<T>;

/**
 * Route Handler 공통 에러 처리 래퍼.
 * AppError → 해당 status, ZodError → 400, 그 외 → 500.
 */
export async function handleApi<T>(fn: Handler<T>): Promise<NextResponse> {
  try {
    const data = await fn();
    return NextResponse.json(data ?? { ok: true });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ZodError) {
      const message =
        error.issues[0]?.message ?? "입력값이 올바르지 않습니다.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("[api] unhandled error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}

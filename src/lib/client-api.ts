"use client";

/** 클라이언트 공통 fetch 헬퍼: JSON 파싱 + 한국어 오류 메시지 */
export async function apiFetch<T = unknown>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        ...(init?.body && !(init.body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new Error("네트워크 오류가 발생했습니다. 연결 상태를 확인해 주세요.");
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // JSON이 아닌 응답
  }

  if (!res.ok) {
    const message =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : "요청 처리 중 오류가 발생했습니다.";
    throw new Error(message);
  }
  return data as T;
}

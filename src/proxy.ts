import { NextResponse, type NextRequest } from "next/server";
import { STAFF_SESSION_COOKIE } from "@/lib/constants";
import { verifySessionToken } from "@/lib/session";

/**
 * 운영자 화면(/staff/*) 접근 게이트.
 * 운영자 세션은 응답자 세션과 별도 쿠키를 쓰므로 서로 영향을 주지 않는다.
 * 실제 권한 검증(RBAC)은 각 서버 컴포넌트/Route Handler에서 다시 수행한다.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/staff") && pathname !== "/staff/login") {
    const token = request.cookies.get(STAFF_SESSION_COOKIE)?.value;
    const session = token ? await verifySessionToken(token) : null;
    if (!session || session.kind !== "staff") {
      const loginUrl = new URL("/staff/login", request.url);
      // 로그인 후 원래 보려던 화면으로 돌아가도록 경로를 전달한다.
      loginUrl.searchParams.set("next", `${pathname}${search}`);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/staff/:path*"],
};

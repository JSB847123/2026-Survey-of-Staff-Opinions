import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { verifySessionToken } from "@/lib/session";

/**
 * 운영자 화면(/staff/*) 접근 게이트.
 * 실제 권한 검증(RBAC)은 각 서버 컴포넌트/Route Handler에서 다시 수행한다.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/staff") && pathname !== "/staff/login") {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;
    if (!session || session.kind !== "staff") {
      const loginUrl = new URL("/staff/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/staff/:path*"],
};

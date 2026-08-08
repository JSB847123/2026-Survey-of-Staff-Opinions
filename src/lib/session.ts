import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import {
  LEGACY_SESSION_COOKIE,
  RESPONDENT_SESSION_COOKIE,
  STAFF_SESSION_COOKIE,
  STAFF_SESSION_MAX_AGE_SECONDS,
  RESPONDENT_SESSION_MAX_AGE_SECONDS,
} from "./constants";

export type StaffRole = "reviewer" | "admin";

export type StaffSession = {
  kind: "staff";
  role: StaffRole;
};

export type RespondentSession = {
  kind: "respondent";
  accountId: string;
  loginId: string;
};

export type Session = StaffSession | RespondentSession;

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET 환경변수가 설정되지 않았습니다.");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(session: Session): Promise<string> {
  const maxAge =
    session.kind === "staff"
      ? STAFF_SESSION_MAX_AGE_SECONDS
      : RESPONDENT_SESSION_MAX_AGE_SECONDS;
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + maxAge)
    .sign(getSecretKey());
}

export async function verifySessionToken(
  token: string,
): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (payload.kind === "staff" || payload.kind === "respondent") {
      return payload as unknown as Session;
    }
    return null;
  } catch {
    return null;
  }
}

export function cookieNameFor(kind: Session["kind"]): string {
  return kind === "staff" ? STAFF_SESSION_COOKIE : RESPONDENT_SESSION_COOKIE;
}

/** 운영자 세션 — 응답자 세션과 독립적으로 유지된다. */
export async function getStaffSession(): Promise<StaffSession | null> {
  const store = await cookies();
  const token = store.get(STAFF_SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  return session?.kind === "staff" ? session : null;
}

/** 응답자 세션 — 운영자 세션과 독립적으로 유지된다. */
export async function getRespondentSession(): Promise<RespondentSession | null> {
  const store = await cookies();
  const token = store.get(RESPONDENT_SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  return session?.kind === "respondent" ? session : null;
}

export function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export async function setSessionCookie(session: Session): Promise<void> {
  const token = await createSessionToken(session);
  const maxAge =
    session.kind === "staff"
      ? STAFF_SESSION_MAX_AGE_SECONDS
      : RESPONDENT_SESSION_MAX_AGE_SECONDS;
  const store = await cookies();
  store.set(cookieNameFor(session.kind), token, sessionCookieOptions(maxAge));
  // 역할 분리 이전 쿠키가 남아 있으면 함께 정리한다.
  if (store.get(LEGACY_SESSION_COOKIE)) {
    store.set(LEGACY_SESSION_COOKIE, "", {
      ...sessionCookieOptions(0),
      maxAge: 0,
    });
  }
}

/** 해당 역할의 세션만 종료한다 (다른 역할 세션은 유지). */
export async function clearSessionCookie(
  kind: Session["kind"],
): Promise<void> {
  const store = await cookies();
  store.set(cookieNameFor(kind), "", { ...sessionCookieOptions(0), maxAge: 0 });
  if (store.get(LEGACY_SESSION_COOKIE)) {
    store.set(LEGACY_SESSION_COOKIE, "", {
      ...sessionCookieOptions(0),
      maxAge: 0,
    });
  }
}

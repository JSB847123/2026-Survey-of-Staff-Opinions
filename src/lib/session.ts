import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
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
  surveyId: string;
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

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
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
  store.set(SESSION_COOKIE_NAME, token, sessionCookieOptions(maxAge));
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, "", { ...sessionCookieOptions(0), maxAge: 0 });
}

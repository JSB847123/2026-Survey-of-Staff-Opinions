import "server-only";
import { AppError } from "./errors";
import {
  getSession,
  type RespondentSession,
  type StaffSession,
} from "./session";

export async function requireStaff(): Promise<StaffSession> {
  const session = await getSession();
  if (!session || session.kind !== "staff") {
    throw new AppError(401, "로그인이 필요합니다.");
  }
  return session;
}

export async function requireAdmin(): Promise<StaffSession> {
  const session = await requireStaff();
  if (session.role !== "admin") {
    throw new AppError(403, "관리자만 접근할 수 있습니다.");
  }
  return session;
}

export async function requireRespondent(): Promise<RespondentSession> {
  const session = await getSession();
  if (!session || session.kind !== "respondent") {
    throw new AppError(401, "로그인이 필요합니다.");
  }
  return session;
}

import "server-only";
import { AppError } from "../errors";
import { supabaseStorage } from "./supabase";
import { localStorageDriver } from "./local";
import { dbStorage } from "./db-storage";

export type StorageDriverId = "supabase" | "database" | "local";

export interface FileStorage {
  id: StorageDriverId;
  /** 파일을 저장한다. surveyId는 DB 드라이버가 원본을 연결하는 데 사용한다. */
  put(input: {
    path: string;
    surveyId: string;
    fileName: string;
    contentType: string;
    data: Buffer;
  }): Promise<void>;
  remove(path: string): Promise<void>;
}

export function isSupabaseStorageConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
  );
}

/**
 * 저장 드라이버 선택.
 * 기본값 "auto": Supabase Private Storage를 쓸 수 있으면 사용하고,
 * service role key가 없으면 DB(SurveySourceFile)에 보관해 업로드가 실패하지 않게 한다.
 * (Vercel filesystem은 영구 저장소가 아니므로 local은 개발 환경 전용)
 */
export function getStorage(): FileStorage {
  const driver = (process.env.STORAGE_DRIVER ?? "auto").trim().toLowerCase();

  switch (driver) {
    case "local":
      return localStorageDriver;
    case "database":
    case "db":
      return dbStorage;
    case "supabase":
      if (!isSupabaseStorageConfigured()) {
        throw new AppError(
          500,
          "SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다. Vercel 환경변수를 확인하거나 STORAGE_DRIVER를 auto로 두세요.",
        );
      }
      return supabaseStorage;
    case "auto":
      return isSupabaseStorageConfigured() ? supabaseStorage : dbStorage;
    default:
      throw new AppError(500, `알 수 없는 STORAGE_DRIVER: ${driver}`);
  }
}

/** 관리자 설정 화면에 표시할 현재 저장 방식 */
export function describeStorage(): { id: StorageDriverId; label: string } {
  const storage = getStorage();
  const labels: Record<StorageDriverId, string> = {
    supabase: "Supabase Private Storage",
    database: "데이터베이스 보관 (Supabase Storage 미설정 시 자동 대체)",
    local: "로컬 디스크 (개발 전용)",
  };
  return { id: storage.id, label: labels[storage.id] };
}

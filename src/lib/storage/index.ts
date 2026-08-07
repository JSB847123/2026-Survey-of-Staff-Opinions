import "server-only";
import { AppError } from "../errors";
import { supabaseStorage } from "./supabase";
import { localStorageDriver } from "./local";

export interface FileStorage {
  /** 파일을 저장하고 저장 경로를 반환한다. */
  put(path: string, data: Buffer, contentType: string): Promise<void>;
  remove(path: string): Promise<void>;
}

export function getStorage(): FileStorage {
  const driver = process.env.STORAGE_DRIVER ?? "supabase";
  if (driver === "local") return localStorageDriver;
  if (driver === "supabase") {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new AppError(
        500,
        "SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다.",
      );
    }
    return supabaseStorage;
  }
  throw new AppError(500, `알 수 없는 STORAGE_DRIVER: ${driver}`);
}

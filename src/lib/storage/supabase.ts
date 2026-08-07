import "server-only";
import { createClient } from "@supabase/supabase-js";
import { AppError } from "../errors";
import type { FileStorage } from "./index";

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new AppError(500, "Supabase Storage 환경변수가 설정되지 않았습니다.");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getBucket(): string {
  return process.env.SUPABASE_STORAGE_BUCKET ?? "survey-files";
}

export const supabaseStorage: FileStorage = {
  id: "supabase",

  async put({ path, contentType, data }) {
    const client = getClient();
    const { error } = await client.storage
      .from(getBucket())
      .upload(path, data, { contentType, upsert: false });
    if (error) {
      throw new AppError(500, `파일 저장에 실패했습니다: ${error.message}`);
    }
  },

  async remove(path) {
    const client = getClient();
    const { error } = await client.storage.from(getBucket()).remove([path]);
    if (error) {
      console.error("[storage] remove failed:", error.message);
    }
  },
};
